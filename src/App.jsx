import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_CATEGORIES = [
  { id: "venue", name: "Venue & reception", budget: 0 },
  { id: "catering", name: "Catering & bar", budget: 0 },
  { id: "photo", name: "Photography & videography", budget: 0 },
  { id: "attire", name: "Attire & beauty", budget: 0 },
  { id: "flowers", name: "Flowers & decor", budget: 0 },
  { id: "music", name: "Music & entertainment", budget: 0 },
  { id: "stationery", name: "Invitations & stationery", budget: 0 },
  { id: "rings", name: "Wedding rings", budget: 0 },
  { id: "transport", name: "Transportation", budget: 0 },
  { id: "planner", name: "Planner & coordination", budget: 0 },
  { id: "officiant", name: "Officiant", budget: 0 },
  { id: "favors", name: "Favors & gifts", budget: 0 },
  { id: "misc", name: "Miscellaneous & contingency", budget: 0 },
];

const CATEGORY_FIELD_CONFIG = {
  venue: { quantityLabel: "Venue days", fromGuests: false, defaultQty: 1 },
  catering: { quantityLabel: "Guests", fromGuests: true, defaultQty: 1 },
  photo: { quantityLabel: "Hours booked", fromGuests: false, defaultQty: 1 },
  attire: { quantityLabel: "Items", fromGuests: false, defaultQty: 1 },
  flowers: { quantityLabel: "Arrangements", fromGuests: false, defaultQty: 1 },
  music: { quantityLabel: "Hours booked", fromGuests: false, defaultQty: 1 },
  stationery: { quantityLabel: "Invitations", fromGuests: true, defaultQty: 1 },
  rings: { quantityLabel: "Rings", fromGuests: false, defaultQty: 2 },
  transport: { quantityLabel: "Vehicles", fromGuests: false, defaultQty: 1 },
  planner: { quantityLabel: "Packages", fromGuests: false, defaultQty: 1 },
  officiant: { quantityLabel: "Ceremonies", fromGuests: false, defaultQty: 1 },
  favors: { quantityLabel: "Guests", fromGuests: true, defaultQty: 1 },
  misc: { quantityLabel: "Quantity", fromGuests: false, defaultQty: 1 },
};
const DEFAULT_FIELD_CONFIG = { quantityLabel: "Quantity", fromGuests: false, defaultQty: 1 };
function categoryKeyFromName(name) {
  return DEFAULT_CATEGORIES.find((c) => c.name === name)?.id || null;
}

function fieldConfigFor(catId, categories = DEFAULT_CATEGORIES) {
  const category = categories.find((c) => c.id === catId);
  const configKey = category?.configKey || categoryKeyFromName(category?.name) || catId;
  return CATEGORY_FIELD_CONFIG[configKey] || DEFAULT_FIELD_CONFIG;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://voqakqzkupoxkkwviyxp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_PUBLISHABLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
const CAD = (n) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
    Number.isFinite(n) ? n : 0
  );
const uid = () => Math.random().toString(36).slice(2, 10);

const ink = "#23261F";
const forest = "#2F4739";
const forestSoft = "#EDF1EA";
const brass = "#A9823C";
const brassSoft = "#F6EFDF";
const rose = "#B85C55";
const roseSoft = "#F7EAE8";
const line = "#DAD9CE";
const paper = "#F6F4EE";
const remainingColor = "#E4E2D6";
const sans = "'Work Sans', sans-serif";
const serif = "'Fraunces', serif";

function emptyItemForm(catId, categories = DEFAULT_CATEGORIES) {
  const cfg = fieldConfigFor(catId, categories);
  return {
    categoryId: catId,
    description: "",
    vendor: "",
    quantity: String(cfg.defaultQty),
    unitCost: "",
    tax: "0",
    requiresDeposit: false,
    depositAmount: "",
    depositDueDate: "",
    amountPaid: "",
    balanceDueDate: "",
    date: "",
    notes: "",
  };
}

function itemTotals(it) {
  const total = (Number(it.quantity) || 0) * (Number(it.unitCost) || 0) + (Number(it.tax) || 0);
  const paid = Number(it.amountPaid) || 0;
  const planned = Math.max(0, total - paid);
  const depositCovered = it.requiresDeposit
    ? paid >= (Number(it.depositAmount) || 0) && (Number(it.depositAmount) || 0) > 0
    : null;
  return { total, paid, planned, depositCovered };
}

function dbCategoryToApp(row) {
  return { id: row.id, name: row.name, budget: Number(row.budget) || 0 };
}

function dbItemToApp(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    description: row.description || "",
    vendor: row.vendor || "",
    quantity: Number(row.quantity) || 0,
    unitCost: Number(row.unit_cost) || 0,
    tax: Number(row.tax) || 0,
    requiresDeposit: !!row.requires_deposit,
    depositAmount: Number(row.deposit_amount) || 0,
    depositDueDate: row.deposit_due_date || "",
    amountPaid: Number(row.amount_paid) || 0,
    balanceDueDate: row.balance_due_date || "",
    date: row.item_date || "",
    notes: row.notes || "",
  };
}

function appItemToDb(item, weddingId) {
  return {
    wedding_id: weddingId,
    category_id: item.categoryId,
    description: item.description,
    vendor: item.vendor || null,
    quantity: Number(item.quantity) || 0,
    unit_cost: Number(item.unitCost) || 0,
    tax: Number(item.tax) || 0,
    requires_deposit: !!item.requiresDeposit,
    deposit_amount: Number(item.depositAmount) || 0,
    deposit_due_date: item.depositDueDate || null,
    amount_paid: Number(item.amountPaid) || 0,
    balance_due_date: item.balanceDueDate || null,
    item_date: item.date || null,
    notes: item.notes || null,
  };
}

function AuthScreen({ onSignedIn }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sendPasswordReset() {
    if (!supabase || !email.trim()) {
      setMessage("Enter your email address first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
      });
      if (error) throw error;
      setMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      setMessage(err?.message || "Couldn't send the reset email.");
    } finally {
      setBusy(false);
    }
  }

  async function updateRecoveredPassword(e) {
    e.preventDefault();
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords don't match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password updated. You can continue to your budget.");
      window.history.replaceState({}, document.title, window.location.pathname);
      setMode("signin");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage(err?.message || "Couldn't update your password.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
        });
        if (error) throw error;
        if (data.session) onSignedIn?.(data.session);
        else setMessage("Account created. Check your email to confirm your account, then sign in.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        onSignedIn?.(data.session);
      }
    } catch (err) {
      setMessage(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recovery");
        setMessage("Choose a new password for your account.");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!supabase) {
    return (
      <div style={{ fontFamily: sans, background: paper, color: ink, minHeight: "100vh" }}>
        <GoogleFontImport />
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "90px 24px" }}>
          <div style={{ fontFamily: serif, fontSize: 30, marginBottom: 10 }}>Connect Supabase</div>
          <div style={{ fontSize: 13, color: "#6b6a63", lineHeight: 1.6 }}>
            Add <strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong> to your <code>.env.local</code> file, then restart Vite.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: sans, background: paper, color: ink, minHeight: "100vh" }}>
      <GoogleFontImport />
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 500, marginBottom: 8 }}>Wedding budget</div>
        <div style={{ fontSize: 13, color: "#6b6a63", marginBottom: 28 }}>
          {mode === "signin" ? "Sign in to continue planning." : "Create an account to save your wedding budget securely."}
        </div>
        {mode === "recovery" ? (
          <form onSubmit={updateRecoveredPassword} style={{ display: "grid", gap: 14 }}>
            <Field label="New password">
              <input type="password" required minLength="6" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, height: 42 }} />
            </Field>
            <Field label="Confirm new password">
              <input type="password" required minLength="6" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ ...inputStyle, height: 42 }} />
            </Field>
            {message && <div style={{ fontSize: 12, color: message.startsWith("Password updated") ? forest : rose, lineHeight: 1.5 }}>{message}</div>}
            <button type="submit" disabled={busy} style={{ ...primaryBtnStyle, height: 42, opacity: busy ? 0.65 : 1 }}>
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
              <Field label="Email">
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, height: 42 }} />
              </Field>
              <Field label="Password">
                <input type="password" required minLength="6" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, height: 42 }} />
              </Field>
              {message && <div style={{ fontSize: 12, color: message.startsWith("Account created") || message.startsWith("Password reset email sent") ? forest : rose, lineHeight: 1.5 }}>{message}</div>}
              <button type="submit" disabled={busy} style={{ ...primaryBtnStyle, height: 42, opacity: busy ? 0.65 : 1 }}>
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>
            {mode === "signin" && (
              <button type="button" disabled={busy} onClick={sendPasswordReset} style={{ ...iconTextBtnStyle, padding: "12px 0 0", fontSize: 12 }}>
                Forgot password?
              </button>
            )}
            <button type="button" onClick={() => { setMode((m) => m === "signin" ? "signup" : "signin"); setMessage(""); }} style={{ ...iconTextBtnStyle, padding: "10px 0 0", fontSize: 12 }}>
              {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function WeddingBudgetTracker() {
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [weddingId, setWeddingId] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [overallBudget, setOverallBudget] = useState(0);
  const [guestCount, setGuestCount] = useState("");
  const [budgetLocked, setBudgetLocked] = useState(true);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState("summary");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [newCatName, setNewCatName] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [form, setForm] = useState(emptyItemForm(DEFAULT_CATEGORIES[0].id));
  const [editingId, setEditingId] = useState(null);
  const [itemError, setItemError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      return;
    }

    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session || null);
      setAuthChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthChecked(true);
      if (!nextSession) {
        setWeddingId(null);
        setSetupComplete(false);
        setOverallBudget(0);
        setGuestCount("");
        setCategories(DEFAULT_CATEGORIES);
        setItems([]);
        setLoaded(false);
      }
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !supabase) return;
    let cancelled = false;

    (async () => {
      setLoaded(false);
      setSaveState("idle");
      try {
        const { data: wedding, error: weddingError } = await supabase
          .from("weddings")
          .select("id, overall_budget, guest_count, setup_complete")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (weddingError) throw weddingError;

        if (!wedding) {
          if (!cancelled) {
            setWeddingId(null);
            setSetupComplete(false);
            setOverallBudget(0);
            setGuestCount("");
            setBudgetLocked(true);
            setCategories(DEFAULT_CATEGORIES);
            setItems([]);
            setForm(emptyItemForm(DEFAULT_CATEGORIES[0].id));
          }
          return;
        }

        const [{ data: categoryRowsInitial, error: categoryError }, { data: itemRows, error: itemErrorResult }] = await Promise.all([
          supabase.from("categories").select("id, name, budget").eq("wedding_id", wedding.id).order("created_at"),
          supabase.from("items").select("*").eq("wedding_id", wedding.id).order("created_at"),
        ]);

        if (categoryError) throw categoryError;
        if (itemErrorResult) throw itemErrorResult;

        let categoryRows = categoryRowsInitial || [];
        if (categoryRows.length === 0) {
          const { data: seededCategories, error: seedError } = await supabase
            .from("categories")
            .insert(DEFAULT_CATEGORIES.map((c) => ({ wedding_id: wedding.id, name: c.name, budget: 0 })))
            .select("id, name, budget");
          if (seedError) throw seedError;
          categoryRows = seededCategories || [];
        }

        if (!cancelled) {
          const nextCategories = categoryRows.map(dbCategoryToApp);
          setWeddingId(wedding.id);
          setSetupComplete(!!wedding.setup_complete);
          setOverallBudget(Number(wedding.overall_budget) || 0);
          setGuestCount(wedding.guest_count == null ? "" : String(wedding.guest_count));
          setBudgetLocked(true);
          setCategories(nextCategories.length ? nextCategories : DEFAULT_CATEGORIES);
          setItems((itemRows || []).map(dbItemToApp));
          setForm(emptyItemForm(nextCategories[0]?.id || DEFAULT_CATEGORIES[0].id, nextCategories.length ? nextCategories : DEFAULT_CATEGORIES));
          setSaveState("saved");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setSaveState("error");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Budget and guest-count changes are saved after a short pause.
  useEffect(() => {
    if (!loaded || !weddingId || !supabase || !setupComplete) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      const { error } = await supabase
        .from("weddings")
        .update({
          overall_budget: Number(overallBudget) || 0,
          guest_count: guestCount === "" ? null : Math.max(0, Number(guestCount) || 0),
          setup_complete: true,
        })
        .eq("id", weddingId);
      setSaveState(error ? "error" : "saved");
    }, 500);
    return () => clearTimeout(t);
  }, [overallBudget, guestCount, weddingId, loaded, setupComplete]);

  const itemsByCat = useMemo(() => {
    const map = {};
    for (const c of categories) map[c.id] = [];
    for (const it of items) {
      if (!map[it.categoryId]) map[it.categoryId] = [];
      map[it.categoryId].push(it);
    }
    return map;
  }, [categories, items]);

  function categoryTotals(catId) {
    const list = itemsByCat[catId] || [];
    let planned = 0, paid = 0;
    for (const it of list) {
      const t = itemTotals(it);
      planned += t.planned;
      paid += t.paid;
    }
    return { planned, paid };
  }

  const grandBudget = Number(overallBudget) || 0;
  const assignedTotal = categories.reduce((s, c) => s + (Number(c.budget) || 0), 0);
  const unassigned = grandBudget - assignedTotal;
  const grandTotals = categories.reduce(
    (acc, c) => {
      const t = categoryTotals(c.id);
      acc.planned += t.planned;
      acc.paid += t.paid;
      return acc;
    },
    { planned: 0, paid: 0 }
  );

  async function updateCategoryBudget(id, value) {
    const next = Math.max(0, Number(value) || 0);
    const previous = categories;
    setCategories((cats) => cats.map((c) => (c.id === id ? { ...c, budget: next } : c)));
    if (!supabase || !weddingId) return;
    setSaveState("saving");
    const { error } = await supabase.from("categories").update({ budget: next }).eq("id", id).eq("wedding_id", weddingId);
    if (error) {
      console.error(error);
      setCategories(previous);
      setSaveState("error");
    } else {
      setSaveState("saved");
    }
  }

  async function splitRemainingEvenly() {
    if (categories.length === 0 || !supabase || !weddingId) return;
    const share = Math.max(0, unassigned) / categories.length;
    const nextCategories = categories.map((c) => ({ ...c, budget: (Number(c.budget) || 0) + share }));
    const previous = categories;
    setCategories(nextCategories);
    setSaveState("saving");
    const results = await Promise.all(
      nextCategories.map((c) => supabase.from("categories").update({ budget: c.budget }).eq("id", c.id).eq("wedding_id", weddingId))
    );
    if (results.some((r) => r.error)) {
      setCategories(previous);
      setSaveState("error");
    } else {
      setSaveState("saved");
    }
  }

  async function addCategory() {
    const name = newCatName.trim();
    if (!name || !supabase || !weddingId) return;
    setSaveState("saving");
    const { data, error } = await supabase
      .from("categories")
      .insert({ wedding_id: weddingId, name, budget: 0 })
      .select("id, name, budget")
      .single();
    if (error) {
      console.error(error);
      setSaveState("error");
      return;
    }
    setCategories((cats) => [...cats, dbCategoryToApp(data)]);
    setNewCatName("");
    setShowAddCat(false);
    setManageCategoriesOpen(true);
    setPage("summary");
    setSaveState("saved");
  }

  async function removeCategory(id) {
    if (items.some((it) => it.categoryId === id)) {
      if (!window.confirm("This category has items in it. Delete it and all its items?")) return;
    }
    if (!supabase || !weddingId) return;
    setSaveState("saving");
    const { error } = await supabase.from("categories").delete().eq("id", id).eq("wedding_id", weddingId);
    if (error) {
      console.error(error);
      setSaveState("error");
      return;
    }
    setCategories((cats) => cats.filter((c) => c.id !== id));
    setItems((its) => its.filter((it) => it.categoryId !== id));
    if (page === id) setPage("summary");
    setSaveState("saved");
  }

  function openAddPanel(catId) {
    setForm(emptyItemForm(catId || categories[0]?.id, categories));
    setEditingId(null);
    setItemError("");
    setAddOpen(true);
  }

  function openEditItem(it) {
    setForm({
      categoryId: it.categoryId,
      description: it.description,
      vendor: it.vendor || "",
      quantity: String(it.quantity),
      unitCost: String(it.unitCost),
      tax: String(it.tax),
      requiresDeposit: !!it.requiresDeposit,
      depositAmount: it.depositAmount ? String(it.depositAmount) : "",
      depositDueDate: it.depositDueDate || "",
      amountPaid: String(it.amountPaid),
      balanceDueDate: it.balanceDueDate || "",
      date: it.date || "",
      notes: it.notes || "",
    });
    setEditingId(it.id);
    setItemError("");
    setAddOpen(true);
  }

  function onCategoryChangeInForm(catId) {
    const cfg = fieldConfigFor(catId, categories);
    setForm((f) => ({
      ...f,
      categoryId: catId,
      quantity: f.quantity && f.quantity !== "" ? f.quantity : String(cfg.defaultQty),
    }));
  }

  async function saveItem(e) {
    e.preventDefault();
    setItemError("");
    if (!form.description.trim() || !form.categoryId) {
      setItemError("Enter a description for this item.");
      return;
    }
    if (!supabase || !weddingId) {
      setItemError("Your wedding data is not loaded yet.");
      return;
    }

    const payload = {
      categoryId: form.categoryId,
      description: form.description.trim(),
      vendor: form.vendor.trim(),
      quantity: Math.max(0, Number(form.quantity) || 0),
      unitCost: Math.max(0, Number(form.unitCost) || 0),
      tax: Math.max(0, Number(form.tax) || 0),
      requiresDeposit: form.requiresDeposit,
      depositAmount: form.requiresDeposit ? Math.max(0, Number(form.depositAmount) || 0) : 0,
      depositDueDate: form.requiresDeposit ? form.depositDueDate : "",
      amountPaid: Math.max(0, Number(form.amountPaid) || 0),
      balanceDueDate: form.balanceDueDate,
      date: form.date,
      notes: form.notes.trim(),
    };

    setSaveState("saving");
    if (editingId) {
      const { data, error } = await supabase
        .from("items")
        .update(appItemToDb(payload, weddingId))
        .eq("id", editingId)
        .eq("wedding_id", weddingId)
        .select("*")
        .single();
      if (error) {
        console.error(error);
        setItemError(error.message);
        setSaveState("error");
        return;
      }
      setItems((its) => its.map((it) => (it.id === editingId ? dbItemToApp(data) : it)));
    } else {
      const { data, error } = await supabase
        .from("items")
        .insert(appItemToDb(payload, weddingId))
        .select("*")
        .single();
      if (error) {
        console.error(error);
        setItemError(error.message);
        setSaveState("error");
        return;
      }
      setItems((its) => [...its, dbItemToApp(data)]);
    }

    setForm(emptyItemForm(form.categoryId, categories));
    setEditingId(null);
    setItemError("");
    setAddOpen(false);
    setSaveState("saved");
  }

  async function deleteItem(id) {
    if (!supabase || !weddingId) return;
    setSaveState("saving");
    const { error } = await supabase.from("items").delete().eq("id", id).eq("wedding_id", weddingId);
    if (error) {
      console.error(error);
      setSaveState("error");
      return;
    }
    setItems((its) => its.filter((it) => it.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setAddOpen(false);
    }
    setSaveState("saved");
  }

  function updateOverallBudgetFromNav(value) {
    const next = Math.max(0, Number(value) || 0);
    setOverallBudget(next);
  }

  async function finishSetup(e) {
    e.preventDefault();

    const budget = Number(overallBudget);
    if (!Number.isFinite(budget) || budget <= 0) {
      setSetupError("Enter your overall budget to continue.");
      return;
    }
    if (!supabase || !session?.user?.id) {
      setSetupError("You need to be signed in to continue.");
      return;
    }

    setSetupError("");
    setSaveState("saving");
    try {
      const { data: wedding, error: weddingError } = await supabase
        .from("weddings")
        .insert({
          user_id: session.user.id,
          overall_budget: budget,
          guest_count: guestCount === "" ? null : Math.max(0, Number(guestCount) || 0),
          setup_complete: false,
        })
        .select("id")
        .single();
      if (weddingError) throw weddingError;

      const { data: categoryRows, error: categoryError } = await supabase
        .from("categories")
        .insert(DEFAULT_CATEGORIES.map((c) => ({ wedding_id: wedding.id, name: c.name, budget: 0 })))
        .select("id, name, budget");
      if (categoryError) throw categoryError;

      const { error: activateError } = await supabase
        .from("weddings")
        .update({ setup_complete: true })
        .eq("id", wedding.id);
      if (activateError) throw activateError;

      const nextCategories = (categoryRows || []).map(dbCategoryToApp);
      setWeddingId(wedding.id);
      setCategories(nextCategories);
      setForm(emptyItemForm(nextCategories[0]?.id, nextCategories));
      setAddOpen(false);
      setPage("summary");
      setSetupComplete(true);
      setBudgetLocked(true);
      setSaveState("saved");
    } catch (err) {
      console.error(err);
      setSetupError(err?.message || "Couldn't create your wedding budget.");
      setSaveState("error");
    }
  }

  if (!authChecked) {
    return (
      <div style={{ fontFamily: sans, padding: 40, textAlign: "center", color: ink }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onSignedIn={setSession} />;
  }

  if (!loaded) {
    return (
      <div style={{ fontFamily: sans, padding: 40, textAlign: "center", color: ink }}>
        Loading your budget…
      </div>
    );
  }

  if (!setupComplete) {
    return (
      <div style={{ fontFamily: sans, background: paper, color: ink, minHeight: "100%" }}>
        <GoogleFontImport />
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px" }}>
          <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, marginBottom: 8 }}>
            Let's set up your wedding budget
          </div>
          <div style={{ fontSize: 13, color: "#6b6a63", marginBottom: 28 }}>
            Two numbers to start — you can add items one by one from here on out.
          </div>
          <form onSubmit={finishSetup} style={{ display: "grid", gap: 16 }}>
            <Field label="Overall wedding budget">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: serif, fontSize: 18, color: forest }}>$</span>
                <input
                  type="number" min="0" autoFocus
                  value={overallBudget === 0 ? "" : overallBudget}
                  onChange={(e) => { setOverallBudget(Math.max(0, Number(e.target.value) || 0)); setSetupError(""); }}
                  placeholder="30000"
                  style={{ ...inputStyle, height: 42, fontSize: 16 }}
                />
              </div>
              {setupError && <div style={{ fontSize: 12, color: rose, marginTop: 6 }}>{setupError}</div>}
            </Field>
            <Field label="Estimated number of guests">
              <input
                type="number" min="0"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="120"
                style={{ ...inputStyle, height: 42, fontSize: 16 }}
              />
            </Field>
            <button type="submit" style={{ ...primaryBtnStyle, height: 42, marginTop: 8 }}>
              Start planning
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeCategory = categories.find((c) => c.id === page);

  return (
    <div style={{ fontFamily: sans, background: paper, color: ink, minHeight: "100%", display: "flex" }}>
      <GoogleFontImport />

      <nav style={{ width: 210, flexShrink: 0, borderRight: `1px solid ${line}`, padding: "24px 14px", background: "#FCFBF7" }}>
        <div style={{ padding: "0 8px", marginBottom: 18 }}>
          <div style={{ fontFamily: serif, fontSize: 19, fontWeight: 500 }}>Wedding budget</div>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "#8a8a80", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Overall budget</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: serif, fontSize: 16, color: forest }}>$</span>
                <input
                  type="number" min="0" step="100"
                  value={overallBudget === 0 ? "" : overallBudget}
                  disabled={budgetLocked}
                  onChange={(e) => updateOverallBudgetFromNav(e.target.value)}
                  style={{ ...inputStyle, height: 34, fontSize: 13, background: budgetLocked ? "#F1F0EA" : "#fff", cursor: budgetLocked ? "not-allowed" : "text", color: ink }}
                />
              </div>
              <button
                type="button"
                onClick={() => setBudgetLocked((v) => !v)}
                style={{ ...iconTextBtnStyle, padding: "5px 0 0", fontSize: 11 }}
              >
                {budgetLocked ? "Unlock to edit" : "Lock budget"}
              </button>
            </div>

            <div>
              <div style={{ fontSize: 10, color: "#8a8a80", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Estimated guests</div>
              <input
                type="number" min="0" step="1"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="120"
                style={{ ...inputStyle, height: 34, fontSize: 13 }}
              />
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#8a8a80", padding: "0 8px", margin: "0 0 6px" }}>
          {saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save" : "Saved"}
        </div>

        <NavItem active={page === "summary"} onClick={() => setPage("summary")} label="Summary" />

        <div style={{ marginTop: 22, padding: "0 8px" }}>
          <button onClick={() => openAddPanel(activeCategory ? activeCategory.id : categories[0]?.id)} style={{ ...primaryBtnStyle, width: "100%" }}>
            + Add item
          </button>
        </div>

        <div style={{ marginTop: 26, padding: "14px 8px 0", borderTop: `1px solid ${line}` }}>
          <div style={{ fontSize: 10, color: "#8a8a80", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 6 }}>
            {session.user.email}
          </div>
          <button type="button" onClick={() => supabase.auth.signOut()} style={{ ...iconTextBtnStyle, padding: 0, fontSize: 11 }}>
            Sign out
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, minWidth: 0, padding: "36px 32px 60px", overflowX: "hidden" }}>
        {addOpen && (
          <AddItemPanel
            form={form}
            setForm={setForm}
            categories={categories}
            editingId={editingId}
            onCategoryChange={onCategoryChangeInForm}
            onSubmit={saveItem}
            itemError={itemError}
            onCancel={() => { setAddOpen(false); setEditingId(null); setItemError(""); }}
          />
        )}

        {page === "summary" ? (
          <SummaryPage
            overallBudget={grandBudget}
            assignedTotal={assignedTotal}
            unassigned={unassigned}
            plannedTotal={grandTotals.planned}
            paidTotal={grandTotals.paid}
            categories={categories}
            categoryTotals={categoryTotals}
            updateCategoryBudget={updateCategoryBudget}
            splitRemainingEvenly={splitRemainingEvenly}
            onSelectCategory={setPage}
            manageCategoriesOpen={manageCategoriesOpen}
            setManageCategoriesOpen={setManageCategoriesOpen}
            showAddCat={showAddCat}
            setShowAddCat={setShowAddCat}
            newCatName={newCatName}
            setNewCatName={setNewCatName}
            addCategory={addCategory}
            removeCategory={removeCategory}
          />
        ) : activeCategory ? (
          <CategoryPage
            category={activeCategory}
            items={itemsByCat[activeCategory.id] || []}
            totals={categoryTotals(activeCategory.id)}
            updateCategoryBudget={updateCategoryBudget}
            onEditItem={openEditItem}
            onDeleteItem={deleteItem}
            onRemoveCategory={removeCategory}
          />
        ) : null}
      </main>
    </div>
  );
}

function GoogleFontImport() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Work+Sans:wght@400;500;600&display=swap');
      * { box-sizing: border-box; }
      input, select, textarea { font-family: 'Work Sans', sans-serif; }
      button { cursor: pointer; }
    `}</style>
  );
}

function NavItem({ active, onClick, label, dotColor }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
        background: active ? "#fff" : "transparent",
        border: active ? `1px solid ${line}` : "1px solid transparent",
        borderRadius: 7, padding: "8px 8px", fontSize: 13, fontWeight: active ? 600 : 400,
        color: ink, marginBottom: 2,
      }}
    >
      {dotColor && <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

function SummaryPage({
  overallBudget, assignedTotal, unassigned, plannedTotal, paidTotal,
  categories, categoryTotals, updateCategoryBudget, splitRemainingEvenly, onSelectCategory,
  manageCategoriesOpen, setManageCategoriesOpen, showAddCat, setShowAddCat, newCatName, setNewCatName, addCategory, removeCategory,
}) {
  const paidVal = Math.min(paidTotal, overallBudget);
  const plannedVal = Math.min(plannedTotal, Math.max(0, overallBudget - paidTotal));
  const remainingVal = Math.max(0, overallBudget - paidTotal - plannedTotal);
  const overflow = paidTotal + plannedTotal - overallBudget;

  const chartData = [
    { name: "Paid", value: paidVal, color: forest },
    { name: "Planned", value: plannedVal, color: brass },
    { name: "Unassigned", value: remainingVal, color: remainingColor },
  ].filter((d) => d.value > 0.004);

  return (
    <div>
      <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, marginBottom: 24 }}>Summary</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 30 }}>
        <SummaryCard label="Overall budget" value={CAD(overallBudget)} />
        <SummaryCard label="Assigned" value={CAD(assignedTotal)} sub={overallBudget > 0 ? `${CAD(unassigned)} unassigned` : null} />
        <SummaryCard label="Planned" value={CAD(plannedTotal)} sub="Committed, not yet paid" />
        <SummaryCard label="Paid" value={CAD(paidTotal)} tone="default" />
      </div>

      <div style={{ border: `1px solid ${line}`, borderRadius: 12, background: "#fff", padding: "22px 26px", marginBottom: 34, display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 220, height: 220, flexShrink: 0 }}>
          {overallBudget > 0 && chartData.length > 0 && PieChart && Pie && Cell && ResponsiveContainer && Tooltip ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={2}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
                <Tooltip formatter={(v) => CAD(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#8a8a80", textAlign: "center", padding: 20 }}>
              Set your overall budget to see the breakdown
            </div>
          )}
        </div>
        <div style={{ display: "grid", gap: 10, flex: 1, minWidth: 180 }}>
          <LegendRow color={forest} label="Paid" value={CAD(paidTotal)} />
          <LegendRow color={brass} label="Planned (unpaid)" value={CAD(plannedTotal)} />
          <LegendRow color={remainingColor} border={line} label="Unassigned" value={CAD(remainingVal)} />
          {overflow > 0.004 && (
            <div style={{ fontSize: 12, color: rose, marginTop: 4 }}>{CAD(overflow)} over your overall budget</div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: serif, fontSize: 19, fontWeight: 500 }}>By category</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {overallBudget > 0 && unassigned > 0.004 && (
            <button onClick={splitRemainingEvenly} style={ghostBtnStyle}>Split {CAD(unassigned)} evenly</button>
          )}
          <button onClick={() => setManageCategoriesOpen((v) => !v)} style={ghostBtnStyle}>
            {manageCategoriesOpen ? "Done" : "Manage categories"}
          </button>
        </div>
      </div>

      {manageCategoriesOpen && (
        <div style={{ border: `1px solid ${line}`, borderRadius: 12, background: "#FCFBF7", padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 500 }}>Manage categories</div>
              <div style={{ fontSize: 12, color: "#7a7a70", marginTop: 3 }}>Add custom categories or remove ones you don't need.</div>
            </div>
            {!showAddCat && (
              <button onClick={() => setShowAddCat(true)} style={primaryBtnStyle}>+ Add category</button>
            )}
          </div>

          {showAddCat && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name"
                style={{ ...inputStyle, maxWidth: 280, height: 36 }}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
              <button onClick={addCategory} style={{ ...primaryBtnStyle, height: 36 }}>Add</button>
              <button onClick={() => { setShowAddCat(false); setNewCatName(""); }} style={{ ...ghostBtnStyle, height: 36 }}>Cancel</button>
            </div>
          )}

          <div style={{ display: "grid", gap: 6 }}>
            {categories.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 10px", background: "#fff", border: `1px solid ${line}`, borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <button onClick={() => removeCategory(c.id)} style={{ ...iconTextBtnStyle, color: rose }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ border: `1px solid ${line}`, borderRadius: 12, background: "#fff", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#8a8a80" }}>
              <th style={thStyle}>Category</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Assigned</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Planned</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Paid</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => {
              const t = categoryTotals(c.id);
              const budget = Number(c.budget) || 0;
              const remaining = budget - t.paid;
              return (
                <tr key={c.id} style={{ borderTop: `1px solid ${line}`, cursor: "pointer" }} onClick={() => onSelectCategory(c.id)}>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{c.name}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number" min="0"
                      value={budget === 0 ? "" : budget}
                      placeholder="0"
                      onChange={(e) => updateCategoryBudget(c.id, Math.max(0, Number(e.target.value) || 0))}
                      style={{ ...inputStyle, height: 28, fontSize: 12, textAlign: "right", width: 100, marginLeft: "auto" }}
                    />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: brass }}>{CAD(t.planned)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: forest, fontWeight: 500 }}>{CAD(t.paid)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: remaining < 0 ? rose : ink }}>{CAD(remaining)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryPage({ category, items, totals, updateCategoryBudget, onEditItem, onDeleteItem, onRemoveCategory }) {
  const budget = Number(category.budget) || 0;
  const remaining = budget - totals.paid;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12 }}>
        <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500 }}>{category.name}</div>
        <button onClick={() => onRemoveCategory(category.id)} style={ghostBtnStyle}>Delete category</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 30 }}>
        <div style={{ background: forestSoft, borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: "#5c5c53", marginBottom: 6 }}>Assigned</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontFamily: serif, fontSize: 18, color: forest }}>$</span>
            <input
              type="number" min="0"
              value={budget === 0 ? "" : budget}
              placeholder="0"
              onChange={(e) => updateCategoryBudget(category.id, Math.max(0, Number(e.target.value) || 0))}
              style={{ ...inputStyle, background: "#fff", height: 34, fontSize: 16, fontFamily: serif }}
            />
          </div>
        </div>
        <SummaryCard label="Planned" value={CAD(totals.planned)} sub="Committed, not yet paid" />
        <SummaryCard label="Paid" value={CAD(totals.paid)} />
        <SummaryCard label={remaining < 0 ? "Over by" : "Remaining"} value={CAD(Math.abs(remaining))} tone={remaining < 0 ? "danger" : "default"} />
      </div>

      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: "#8a8a80", border: `1px solid ${line}`, borderRadius: 12, padding: "24px", background: "#fff" }}>
          No items logged in this category yet. Use "+ Add item" in the sidebar to log your first one.
        </div>
      ) : (
        <div style={{ border: `1px solid ${line}`, borderRadius: 12, background: "#fff", overflow: "hidden", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#8a8a80" }}>
                <th style={thStyle}>Item</th>
                <th style={thStyle}>Vendor</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Qty</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Paid</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Planned</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const t = itemTotals(it);
                return (
                  <tr key={it.id} style={{ borderTop: `1px solid ${line}` }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500 }}>{it.description}</div>
                      {it.requiresDeposit && (
                        <div style={{ fontSize: 11, marginTop: 2, color: t.depositCovered ? forest : brass }}>
                          Deposit {CAD(it.depositAmount)}{it.depositDueDate ? ` due ${it.depositDueDate}` : ""} {t.depositCovered ? "· paid" : "· pending"}
                        </div>
                      )}
                      {it.notes && <div style={{ fontSize: 12, color: "#8a8a80" }}>{it.notes}</div>}
                    </td>
                    <td style={tdStyle}>{it.vendor || "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{it.quantity}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 500 }}>{CAD(t.total)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", color: forest }}>{CAD(t.paid)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", color: brass }}>{CAD(t.planned)}</td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <button onClick={() => onEditItem(it)} style={iconTextBtnStyle}>Edit</button>
                      <button onClick={() => onDeleteItem(it.id)} style={{ ...iconTextBtnStyle, color: rose }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddItemPanel({ form, setForm, categories, editingId, onCategoryChange, onSubmit, itemError, onCancel }) {
  const cfg = fieldConfigFor(form.categoryId, categories);
  return (
    <div style={{ border: `1.5px solid ${forest}`, borderRadius: 12, background: "#fff", padding: 22, marginBottom: 28 }}>
      <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, marginBottom: 16 }}>
        {editingId ? "Edit item" : "Add an item"}
      </div>
      <form onSubmit={onSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
          <Field label="Category">
            <select
              value={form.categoryId}
              onChange={(e) => onCategoryChange(e.target.value)}
              style={inputStyle}
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="What was it">
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Reception hall deposit"
              style={inputStyle}
            />
            {itemError && <div style={{ fontSize: 12, color: rose, marginTop: 4 }}>{itemError}</div>}
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <Field label="Vendor (optional)">
            <input value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} placeholder="e.g. Willow Barn Events" style={inputStyle} />
          </Field>
          <Field label={cfg.quantityLabel}>
            <input type="number" min="0" step="1" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} style={inputStyle} />
          </Field>
          <Field label="Unit cost">
            <input type="number" min="0" step="0.01" value={form.unitCost} onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))} placeholder="0.00" style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <Field label="Tax ($)">
            <input type="number" min="0" step="0.01" value={form.tax} onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))} placeholder="0.00" style={inputStyle} />
          </Field>
          <Field label="Amount paid so far">
            <input type="number" min="0" step="0.01" value={form.amountPaid} onChange={(e) => setForm((f) => ({ ...f, amountPaid: e.target.value }))} placeholder="0.00" style={inputStyle} />
          </Field>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 10, color: "#4b4c44" }}>
          <input
            type="checkbox"
            checked={form.requiresDeposit}
            onChange={(e) => setForm((f) => ({ ...f, requiresDeposit: e.target.checked }))}
          />
          This vendor requires a deposit
        </label>

        {form.requiresDeposit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10, background: brassSoft, padding: 12, borderRadius: 8 }}>
            <Field label="Deposit amount">
              <input type="number" min="0" step="0.01" value={form.depositAmount} onChange={(e) => setForm((f) => ({ ...f, depositAmount: e.target.value }))} placeholder="0.00" style={inputStyle} />
            </Field>
            <Field label="Deposit due date">
              <input type="date" value={form.depositDueDate} onChange={(e) => setForm((f) => ({ ...f, depositDueDate: e.target.value }))} style={inputStyle} />
            </Field>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <Field label="Balance due date (optional)">
            <input type="date" value={form.balanceDueDate} onChange={(e) => setForm((f) => ({ ...f, balanceDueDate: e.target.value }))} style={inputStyle} />
          </Field>
          <Field label="Date (optional)">
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
          </Field>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Field label="Notes (optional)">
            <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Anything worth remembering" style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" style={primaryBtnStyle}>{editingId ? "Save changes" : "Add item"}</button>
          <button type="button" onClick={onCancel} style={ghostBtnStyle}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }) {
  const color = tone === "danger" ? rose : forest;
  return (
    <div style={{ background: tone === "danger" ? roseSoft : forestSoft, borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontSize: 12, color: "#5c5c53", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#7a7a70", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function LegendRow({ color, border, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: color, border: border ? `1px solid ${border}` : "none" }} />
        {label}
      </span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#8a8a80", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  border: `1px solid ${line}`,
  borderRadius: 7,
  fontSize: 13,
  color: ink,
  background: "#fff",
  outline: "none",
};

const primaryBtnStyle = {
  background: forest,
  color: "#fff",
  border: "none",
  borderRadius: 7,
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 500,
};

const ghostBtnStyle = {
  background: "transparent",
  color: forest,
  border: `1px solid ${forest}`,
  borderRadius: 7,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
};

const navAddBtnStyle = {
  background: "transparent",
  border: "none",
  color: forest,
  fontSize: 12,
  fontWeight: 500,
  padding: "8px 8px",
  textAlign: "left",
  width: "100%",
};

const iconTextBtnStyle = {
  background: "transparent",
  border: "none",
  color: forest,
  fontSize: 12,
  fontWeight: 500,
  padding: "4px 6px",
};

const thStyle = { padding: "10px 12px", fontWeight: 500, fontSize: 11 };
const tdStyle = { padding: "12px", verticalAlign: "top" };
