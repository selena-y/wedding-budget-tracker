import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_CATEGORIES = [
  { id: "venue", name: "Venue + Catering", budget: 0 },
  { id: "attire", name: "Wedding Attire", budget: 0 },
  { id: "beauty", name: "Beauty Services", budget: 0 },
  { id: "stationery", name: "Stationery and Invitations", budget: 0 },
  { id: "decor", name: "Decor", budget: 0 },
  { id: "flowers", name: "Florals", budget: 0 },
  { id: "music", name: "Music and Entertainment", budget: 0 },
  { id: "transport", name: "Transportation", budget: 0 },
  { id: "favors", name: "Favors and Gifts", budget: 0 },
  { id: "officiant", name: "Officiant", budget: 0 },
  { id: "photo", name: "Photography & Videography", budget: 0 },
  { id: "misc", name: "Misc", budget: 0 },
].map((category, index) => ({ ...category, categoryType: "default", isVisible: true, sortOrder: index }));

const DEFAULT_CATEGORY_NAMES = new Set(DEFAULT_CATEGORIES.map((category) => category.name));
const isDefaultCategory = (category) =>
  category?.categoryType === "default" || DEFAULT_CATEGORY_NAMES.has(category?.name);

const CATEGORY_FIELD_CONFIG = {
  venue: { quantityLabel: "Guests or quantity", fromGuests: true, defaultQty: 1 },
  photo: { quantityLabel: "Hours booked", fromGuests: false, defaultQty: 1 },
  attire: { quantityLabel: "Items", fromGuests: false, defaultQty: 1 },
  beauty: { quantityLabel: "People", fromGuests: false, defaultQty: 1 },
  decor: { quantityLabel: "Items", fromGuests: false, defaultQty: 1 },
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
const ink = "#373229";
const forest = "#48634B";
const forestSoft = "#E4ECDD";
const brass = "#C0844F";
const brassSoft = "#F6E5C8";
const rose = "#B86064";
const roseSoft = "#F5DADD";
const line = "#D8CEBA";
const paper = "#F7F0DF";
const remainingColor = "#E7DECA";
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
  return {
    id: row.id,
    name: row.name,
    budget: Number(row.budget) || 0,
    isVisible: row.is_visible !== false,
    categoryType: row.category_type || (DEFAULT_CATEGORY_NAMES.has(row.name) ? "default" : "custom"),
    sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
  };
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
    <div className="auth-shell" style={{ fontFamily: sans, background: paper, color: ink, minHeight: "100vh" }}>
      <GoogleFontImport />
      <div className="auth-card" style={{ maxWidth: 440, margin: "0 auto", padding: "42px 38px" }}>
        <div className="brand-mark">MADE WITH LOVE + A SPREADSHEET</div>
        <div style={{ fontFamily: serif, fontSize: 34, fontWeight: 500, marginBottom: 8 }}>Our wedding <em>scrapbook</em></div>
        <div style={{ fontSize: 13, color: "#6b6a63", marginBottom: 28 }}>
          {mode === "signin" ? "Welcome back. Your plans, payments, and handmade details are right where you left them." : "A calm home for every quote, deposit, and DIY detail."}
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
            <div className="auth-actions">
              {mode === "signin" && (
                <button type="button" disabled={busy} onClick={sendPasswordReset} style={{ ...iconTextBtnStyle, padding: 0, fontSize: 12 }}>
                  Forgot password?
                </button>
              )}
              <button type="button" onClick={() => { setMode((m) => m === "signin" ? "signup" : "signin"); setMessage(""); }} style={{ ...iconTextBtnStyle, padding: 0, fontSize: 12 }}>
                {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
              </button>
            </div>
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
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState("summary");
  const [settingsTab, setSettingsTab] = useState("general");
  const [settingsFrom, setSettingsFrom] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [newCatName, setNewCatName] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [draggedCategoryId, setDraggedCategoryId] = useState(null);
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState(null);
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
            setCategories(DEFAULT_CATEGORIES);
            setItems([]);
            setForm(emptyItemForm(DEFAULT_CATEGORIES[0].id));
          }
          return;
        }

        const [{ data: categoryRowsInitial, error: categoryError }, { data: itemRows, error: itemErrorResult }] = await Promise.all([
          supabase.from("categories").select("id, name, budget, is_visible, category_type, sort_order").eq("wedding_id", wedding.id).order("sort_order").order("created_at"),
          supabase.from("items").select("*").eq("wedding_id", wedding.id).order("created_at"),
        ]);

        if (categoryError) throw categoryError;
        if (itemErrorResult) throw itemErrorResult;

        let categoryRows = categoryRowsInitial || [];
        if (categoryRows.length === 0) {
          const { data: seededCategories, error: seedError } = await supabase
            .from("categories")
            .insert(DEFAULT_CATEGORIES.map((c) => ({ wedding_id: wedding.id, name: c.name, budget: 0, is_visible: true, category_type: "default", sort_order: c.sortOrder })))
            .select("id, name, budget, is_visible, category_type, sort_order");
          if (seedError) throw seedError;
          categoryRows = seededCategories || [];
        }

        if (!cancelled) {
          const nextCategories = categoryRows.map(dbCategoryToApp);
          setWeddingId(wedding.id);
          setSetupComplete(!!wedding.setup_complete);
          setOverallBudget(Number(wedding.overall_budget) || 0);
          setGuestCount(wedding.guest_count == null ? "" : String(wedding.guest_count));
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

  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories]
  );

  const visibleCategories = useMemo(
    () => orderedCategories.filter((category) => category.isVisible !== false),
    [orderedCategories]
  );

  const hiddenCategoryIds = useMemo(
    () => orderedCategories.filter((category) => category.isVisible === false).map((category) => category.id),
    [orderedCategories]
  );

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
      .insert({ wedding_id: weddingId, name, budget: 0, is_visible: true, category_type: "custom", sort_order: orderedCategories.length })
      .select("id, name, budget, is_visible, category_type, sort_order")
      .single();
    if (error) {
      console.error(error);
      setSaveState("error");
      return;
    }
    setCategories((cats) => [...cats, dbCategoryToApp(data)]);
    setNewCatName("");
    setShowAddCat(false);
    setSaveState("saved");
  }

  async function removeCategory(id) {
    const category = categories.find((entry) => entry.id === id);
    if (isDefaultCategory(category)) return;
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

  async function renameCategory(id) {
    const name = editingCategoryName.trim();
    const category = categories.find((entry) => entry.id === id);
    if (!name || !category || isDefaultCategory(category) || !supabase || !weddingId) return;
    setSaveState("saving");
    const { error } = await supabase.from("categories").update({ name }).eq("id", id).eq("wedding_id", weddingId);
    if (error) {
      console.error(error);
      setSaveState("error");
      return;
    }
    setCategories((current) => current.map((entry) => entry.id === id ? { ...entry, name } : entry));
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setSaveState("saved");
  }

  async function toggleCategoryVisibility(id) {
    const category = categories.find((entry) => entry.id === id);
    if (!category || !supabase || !weddingId) return;
    const nextVisible = category.isVisible === false;
    const previous = categories;
    setCategories((current) => current.map((entry) => entry.id === id ? { ...entry, isVisible: nextVisible } : entry));
    setSaveState("saving");
    const { error } = await supabase
      .from("categories")
      .update({ is_visible: nextVisible })
      .eq("id", id)
      .eq("wedding_id", weddingId);
    if (error) {
      console.error(error);
      setCategories(previous);
      setSaveState("error");
      return;
    }
    if (page === id) setPage("summary");
    setSaveState("saved");
  }

  async function reorderVisibleCategories(draggedId, targetId) {
    if (!draggedId || !targetId || draggedId === targetId || !supabase || !weddingId) return;
    const draggedIndex = visibleCategories.findIndex((category) => category.id === draggedId);
    const targetIndex = visibleCategories.findIndex((category) => category.id === targetId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    const dragged = visibleCategories[draggedIndex];
    const reorderedVisible = visibleCategories.filter((category) => category.id !== draggedId);
    reorderedVisible.splice(Math.min(targetIndex, reorderedVisible.length), 0, dragged);

    let visibleIndex = 0;
    const nextCategories = orderedCategories.map((category) =>
      category.isVisible === false ? category : reorderedVisible[visibleIndex++]
    ).map((category, index) => ({ ...category, sortOrder: index }));

    const previous = categories;
    setCategories(nextCategories);
    setSaveState("saving");
    const results = await Promise.all(
      nextCategories.map((category) => supabase
        .from("categories")
        .update({ sort_order: category.sortOrder })
        .eq("id", category.id)
        .eq("wedding_id", weddingId))
    );
    if (results.some((result) => result.error)) {
      setCategories(previous);
      setSaveState("error");
      return;
    }
    setSaveState("saved");
  }

  function openSettings(tab = "general", from = null) {
    setSettingsTab(tab);
    setSettingsFrom(from);
    setPage("settings");
  }

  function openAddPanel(catId) {
    const nextCategoryId = catId || visibleCategories[0]?.id || categories[0]?.id;
    const nextForm = emptyItemForm(nextCategoryId, categories);
    const cfg = fieldConfigFor(nextCategoryId, categories);
    if (cfg.fromGuests && Number(guestCount) > 0) nextForm.quantity = String(guestCount);
    setForm(nextForm);
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
      quantity: cfg.fromGuests && Number(guestCount) > 0 ? String(guestCount) : String(cfg.defaultQty),
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
        .insert(DEFAULT_CATEGORIES.map((c) => ({ wedding_id: wedding.id, name: c.name, budget: 0, is_visible: true, category_type: "default", sort_order: c.sortOrder })))
        .select("id, name, budget, is_visible, category_type, sort_order");
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
    <div className="app-shell" style={{ fontFamily: sans, background: paper, color: ink, minHeight: "100%", display: "flex" }}>
      <GoogleFontImport />

      <nav className="app-nav" style={{ width: 244, flexShrink: 0, borderRight: `1px solid ${line}`, padding: "24px 14px", background: "#FCFBF7" }}>
        <div style={{ padding: "0 8px", marginBottom: 18 }}>
          <div className="brand-mark">MADE WITH LOVE + A SPREADSHEET</div>
          <div style={{ fontFamily: serif, fontSize: 25, fontWeight: 500, lineHeight: 1.05 }}>Our wedding<br/><em>scrapbook</em></div>
          <button className="add-item-button" onClick={() => openAddPanel(activeCategory ? activeCategory.id : visibleCategories[0]?.id)} style={{ ...primaryBtnStyle, width: "100%", marginTop: 18 }}>
            + Log wedding expense
          </button>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
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

        <div className="category-nav">
          <NavItem active={page === "summary"} onClick={() => { setPage("summary"); setSettingsFrom(null); }} label="Summary" />
          {visibleCategories.map((category) => (
            <NavItem
              key={category.id}
              active={page === category.id}
              onClick={() => setPage(category.id)}
              label={category.name}
              draggable
              dragging={draggedCategoryId === category.id}
              dropTarget={dropTargetCategoryId === category.id && draggedCategoryId !== category.id}
              onDragStart={(event) => {
                setDraggedCategoryId(category.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", category.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTargetCategoryId(category.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = event.dataTransfer.getData("text/plain") || draggedCategoryId;
                reorderVisibleCategories(sourceId, category.id);
                setDraggedCategoryId(null);
                setDropTargetCategoryId(null);
              }}
              onDragEnd={() => {
                setDraggedCategoryId(null);
                setDropTargetCategoryId(null);
              }}
            />
          ))}
        </div>

        <div style={{ marginTop: 26, padding: "14px 8px 0", borderTop: `1px solid ${line}` }}>
          <NavItem active={page === "settings"} onClick={() => openSettings("general")} label="Settings" />
          <div style={{ fontSize: 10, color: "#8a8a80", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 6 }}>
            {session.user.email}
          </div>
          <button type="button" onClick={() => supabase.auth.signOut()} style={{ ...iconTextBtnStyle, padding: 0, fontSize: 11 }}>
            Sign out
          </button>
        </div>
      </nav>

      <main className="app-main" style={{ flex: 1, minWidth: 0, padding: "42px 44px 70px", overflowX: "hidden" }}>
        {addOpen && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setAddOpen(false); setEditingId(null); setItemError(""); } }}>
            <div className="expense-dialog" role="dialog" aria-modal="true" aria-label={editingId ? "Edit wedding expense" : "Log wedding expense"}>
              <AddItemPanel
                form={form}
                setForm={setForm}
                categories={visibleCategories.length ? visibleCategories : categories}
                editingId={editingId}
                onCategoryChange={onCategoryChangeInForm}
                onSubmit={saveItem}
                itemError={itemError}
                onCancel={() => { setAddOpen(false); setEditingId(null); setItemError(""); }}
              />
            </div>
          </div>
        )}

        {page === "summary" ? (
          <SummaryPage
            overallBudget={grandBudget}
            assignedTotal={assignedTotal}
            unassigned={unassigned}
            plannedTotal={grandTotals.planned}
            paidTotal={grandTotals.paid}
            categories={visibleCategories}
            categoryTotals={categoryTotals}
            updateCategoryBudget={updateCategoryBudget}
            splitRemainingEvenly={splitRemainingEvenly}
            onSelectCategory={setPage}
            onEditBudget={() => openSettings("general", "summary")}
            onManageCategories={() => openSettings("categories", "summary")}
          />
        ) : page === "settings" ? (
          <SettingsPage
            activeTab={settingsTab}
            setActiveTab={setSettingsTab}
            from={settingsFrom}
            onBack={() => { setPage(settingsFrom || "summary"); setSettingsFrom(null); }}
            overallBudget={overallBudget}
            setOverallBudget={setOverallBudget}
            categories={orderedCategories}
            hiddenCategoryIds={hiddenCategoryIds}
            toggleCategoryVisibility={toggleCategoryVisibility}
            showAddCat={showAddCat}
            setShowAddCat={setShowAddCat}
            newCatName={newCatName}
            setNewCatName={setNewCatName}
            addCategory={addCategory}
            removeCategory={removeCategory}
            editingCategoryId={editingCategoryId}
            setEditingCategoryId={setEditingCategoryId}
            editingCategoryName={editingCategoryName}
            setEditingCategoryName={setEditingCategoryName}
            renameCategory={renameCategory}
          />
        ) : activeCategory ? (
          <CategoryPage
            category={activeCategory}
            items={itemsByCat[activeCategory.id] || []}
            totals={categoryTotals(activeCategory.id)}
            updateCategoryBudget={updateCategoryBudget}
            onBack={() => setPage("summary")}
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
      @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=DM+Mono:wght@400;500&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Work+Sans:wght@400;500;600&display=swap');
      * { box-sizing: border-box; }
      html, body, #root { min-height: 100%; }
      body { background: ${paper}; }
      input, select, textarea { font-family: 'Work Sans', sans-serif; }
      button { cursor: pointer; }
      button, input, select, textarea { transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease, background .18s ease; }
      button:hover { transform: translateY(-1px); }
      input:focus, select:focus, textarea:focus { border-color: ${forest} !important; box-shadow: 0 0 0 3px rgba(61,89,72,.10); }
      .app-shell { background-color: ${paper}; background-image: radial-gradient(circle at 12% 10%, rgba(184,96,100,.10), transparent 24%), radial-gradient(circle at 86% 4%, rgba(72,99,75,.12), transparent 22%), repeating-linear-gradient(0deg, rgba(83,69,46,.024) 0, rgba(83,69,46,.024) 1px, transparent 1px, transparent 4px); }
      .auth-shell { display: grid; place-items: center; padding: 30px 18px; background-image: radial-gradient(circle at 15% 15%, rgba(192,132,79,.18), transparent 24%), radial-gradient(circle at 88% 84%, rgba(72,99,75,.15), transparent 27%), repeating-linear-gradient(0deg, rgba(83,69,46,.025) 0, rgba(83,69,46,.025) 1px, transparent 1px, transparent 4px); }
      .auth-card { position: relative; width: 100%; background: #fffdf7; border: 1px solid ${line}; border-radius: 3px; box-shadow: 7px 9px 0 rgba(72,99,75,.12), 0 24px 70px rgba(55,50,41,.10); transform: rotate(-.45deg); }
      .auth-card:before { content: ''; position: absolute; width: 112px; height: 25px; top: -13px; left: calc(50% - 56px); background: rgba(226,190,130,.70); transform: rotate(1.5deg); box-shadow: inset 0 0 12px rgba(255,255,255,.3); }
      .auth-actions { display: flex; justify-content: space-between; gap: 18px; padding-top: 14px; }
      .app-nav { position: sticky; top: 0; height: 100vh; overflow-y: auto; box-shadow: 8px 0 0 rgba(192,132,79,.08), 12px 0 30px rgba(55,50,41,.05); }
      .brand-mark, .nav-section-label { font-family: 'DM Mono', monospace; text-transform: uppercase; letter-spacing: .12em; color: ${brass}; font-size: 9px; font-weight: 500; }
      .brand-mark { margin-bottom: 8px; }
      .nav-section-label { color: #8A8376; margin: 22px 8px 8px; }
      .category-nav { display: grid; gap: 1px; }
      .nav-item { position: relative; outline: none; }
      .nav-item:focus, .nav-item:focus-visible { outline: none; }
      .nav-item[draggable="true"] { cursor: grab; }
      .nav-item[draggable="true"]:active { cursor: grabbing; }
      .nav-item.dragging { opacity: .45; }
      .nav-item.drop-target { box-shadow: inset 0 3px 0 ${brass}; }
      .drag-handle { margin-left: auto; color: #9A9183; font: 600 14px/1 'DM Mono', monospace; opacity: 0; transition: opacity .18s ease; }
      .nav-item:hover .drag-handle, .nav-item:focus-visible .drag-handle { opacity: 1; }
      .add-item-button { box-shadow: 4px 4px 0 rgba(192,132,79,.30); transform: rotate(-.5deg); }
      .page-kicker { font-family: 'DM Mono', monospace; letter-spacing: .14em; font-size: 10px; color: ${brass}; text-transform: uppercase; margin-bottom: 10px; }
      .summary-hero { position: relative; padding: 34px 36px 31px; margin: 8px 10px 30px 3px; border: 1px solid #DCCFB5; border-radius: 3px; background: #FFFDF6; color: ${ink}; overflow: visible; box-shadow: 8px 9px 0 #DDE7D7, 0 18px 45px rgba(55,50,41,.10); transform: rotate(-.3deg); }
      .summary-hero:before { content: ''; position: absolute; width: 120px; height: 27px; top: -14px; left: 9%; background: rgba(230,196,137,.72); transform: rotate(-3deg); }
      .summary-hero:after { content: '❀'; position: absolute; right: 24px; bottom: -18px; font-family: ${serif}; font-size: 104px; line-height: 1; color: ${roseSoft}; transform: rotate(12deg); z-index: -1; }
      .summary-hero h1 { position: relative; margin: 0; max-width: 680px; font: 500 clamp(32px,4vw,52px)/1.02 ${serif}; letter-spacing: -.025em; }
      .summary-hero h1 em { color: ${rose}; }
      .summary-hero p { margin: 14px 0 0; max-width: 590px; color: #6F6658; font-size: 13px; line-height: 1.65; }
      .scrap-note { position: absolute; right: 8%; top: 20px; color: ${forest}; font: 600 23px/1 'Caveat', cursive; transform: rotate(5deg); }
      .scrap-note:after { content: '↙'; display: inline-block; margin-left: 4px; transform: rotate(12deg); }
      .scrap-card { border: 1px solid rgba(104,91,66,.08); box-shadow: 3px 4px 0 rgba(192,132,79,.11); }
      .scrap-card:nth-child(2n) { transform: rotate(.35deg); }
      .scrap-card:nth-child(2n+1) { transform: rotate(-.25deg); }
      tbody tr:hover { background: #FFFCF2; }
      thead { background: rgba(246,229,200,.28); }
      .modal-backdrop { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 28px; background: rgba(55,50,41,.55); backdrop-filter: blur(4px); animation: fade-in .18s ease-out; }
      .expense-dialog { width: min(760px, 100%); max-height: calc(100vh - 56px); overflow-y: auto; background: #fffdf7; border: 1px solid ${line}; border-radius: 4px; box-shadow: 10px 12px 0 rgba(72,99,75,.18), 0 32px 80px rgba(35,31,25,.3); animation: dialog-in .22s ease-out; }
      .breadcrumb { display: inline-flex; gap: 8px; align-items: center; margin: 0 0 22px; padding: 0; border: 0; background: transparent; color: ${forest}; font-size: 12px; font-weight: 600; }
      .breadcrumb span { color: ${brass}; }
      .settings-tabs { display: flex; gap: 26px; border-bottom: 1px solid ${line}; margin-bottom: 22px; }
      .settings-tabs button { position: relative; border: 0; background: transparent; padding: 11px 1px 12px; color: #777064; font-size: 13px; font-weight: 600; }
      .settings-tabs button.active { color: ${forest}; }
      .settings-tabs button.active:after { content: ''; position: absolute; height: 3px; left: 0; right: 0; bottom: -1px; background: ${forest}; border-radius: 4px 4px 0 0; }
      .settings-card { padding: 24px; background: #fffdf7; border: 1px solid ${line}; border-radius: 3px; box-shadow: 5px 6px 0 rgba(192,132,79,.10); }
      .settings-card-copy { display: grid; grid-template-columns: minmax(180px,1fr) minmax(240px,1.4fr); gap: 20px; align-items: start; margin-bottom: 24px; }
      .settings-card p { margin: 5px 0 0; max-width: 580px; color: #766D60; font-size: 12px; line-height: 1.6; }
      .category-settings-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 22px; margin-bottom: 20px; }
      .add-category-row { display: grid; grid-template-columns: minmax(180px,1fr) auto auto; gap: 8px; padding: 14px; margin-bottom: 14px; background: ${brassSoft}; }
      .settings-category-list { display: grid; border-top: 1px solid ${line}; }
      .settings-category-row { display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 13px; align-items: center; min-height: 61px; padding: 10px 4px; border-bottom: 1px solid ${line}; }
      .category-name-cell { min-width: 0; font-size: 13px; }
      .category-type { margin-top: 3px; color: #938A7C; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
      .category-actions { display: flex; gap: 2px; }
      .visibility-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
      .visibility-toggle input { position: absolute; opacity: 0; pointer-events: none; }
      .toggle-track { width: 36px; height: 21px; padding: 3px; border-radius: 20px; background: #CFC8BA; transition: background .18s ease; }
      .toggle-track span { display: block; width: 15px; height: 15px; border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,.18); transition: transform .18s ease; }
      .visibility-toggle input:checked + .toggle-track { background: ${forest}; }
      .visibility-toggle input:checked + .toggle-track span { transform: translateX(15px); }
      .visibility-toggle input:focus-visible + .toggle-track { outline: 3px solid rgba(72,99,75,.2); outline-offset: 2px; }
      .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
      @keyframes fade-in { from { opacity: 0; } }
      @keyframes dialog-in { from { opacity: 0; transform: translateY(12px) rotate(-.3deg); } }
      @media (max-width: 900px) {
        .app-shell { display: block !important; }
        .app-nav { position: relative; width: 100% !important; height: auto; max-height: none; border-right: 0 !important; border-bottom: 1px solid ${line}; }
        .category-nav { grid-template-columns: repeat(2,minmax(0,1fr)); max-height: 190px; overflow-y: auto; }
        .app-main { padding: 28px 18px 56px !important; }
        .app-main > div > div[style*="repeat(4, 1fr)"] { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
      }
      @media (max-width: 560px) {
        .summary-hero { padding: 28px 20px 23px; }
        .scrap-note { display: none; }
        .app-main > div > div[style*="repeat(4, 1fr)"] { grid-template-columns: 1fr !important; }
        .modal-backdrop { padding: 12px; place-items: end center; }
        .expense-dialog { max-height: calc(100vh - 24px); }
        .expense-dialog form > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        .settings-card { padding: 18px 14px; }
        .settings-card-copy { grid-template-columns: 1fr; }
        .category-settings-heading { display: grid; }
        .add-category-row { grid-template-columns: 1fr; }
        .settings-category-row { grid-template-columns: auto minmax(0,1fr); }
        .category-actions { grid-column: 2; }
        table { min-width: 680px; }
      }
    `}</style>
  );
}

function NavItem({
  active, onClick, label, draggable = false, dragging = false, dropTarget = false,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  return (
    <button
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`nav-item${dragging ? " dragging" : ""}${dropTarget ? " drop-target" : ""}`}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
        background: active ? "#C5D6C2" : "transparent",
        border: "none",
        borderRadius: 7, padding: "8px 8px", fontSize: 13, fontWeight: active ? 600 : 400,
        color: active ? forest : ink, marginBottom: 2,
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {draggable && <span className="drag-handle" aria-hidden="true">⋮⋮</span>}
    </button>
  );
}

function SummaryPage({
  overallBudget, assignedTotal, unassigned, plannedTotal, paidTotal,
  categories, categoryTotals, updateCategoryBudget, splitRemainingEvenly, onSelectCategory,
  onEditBudget, onManageCategories,
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
      <div className="page-kicker">Your DIY planning desk</div>
      <div className="summary-hero">
        <div className="scrap-note">one lovely thing at a time</div>
        <h1>Your celebration,<br/><em>made by you.</em></h1>
        <p>Pin down every quote, deposit, thrifted find, and handmade detail. Start with the next little thing—not the whole wedding at once.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 30 }}>
        <SummaryCard label="Overall budget" value={CAD(overallBudget)} actionLabel="Edit budget" onAction={onEditBudget} />
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
          <button onClick={onManageCategories} style={ghostBtnStyle}>Manage categories</button>
        </div>
      </div>

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

function SettingsPage({
  activeTab, setActiveTab, from, onBack, overallBudget, setOverallBudget,
  categories, hiddenCategoryIds, toggleCategoryVisibility,
  showAddCat, setShowAddCat, newCatName, setNewCatName, addCategory, removeCategory,
  editingCategoryId, setEditingCategoryId, editingCategoryName, setEditingCategoryName, renameCategory,
}) {
  return (
    <div className="settings-page">
      {from && (
        <button type="button" className="breadcrumb" onClick={onBack}>
          Summary <span>›</span> Settings
        </button>
      )}
      <div className="page-kicker">Make the planner yours</div>
      <div style={{ fontFamily: serif, fontSize: 34, fontWeight: 500, marginBottom: 6 }}>Settings</div>
      <div style={{ fontSize: 13, color: "#766D60", marginBottom: 24 }}>Keep important planning choices tucked away from the day-to-day money work.</div>

      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        <button type="button" role="tab" aria-selected={activeTab === "general"} className={activeTab === "general" ? "active" : ""} onClick={() => setActiveTab("general")}>General</button>
        <button type="button" role="tab" aria-selected={activeTab === "categories"} className={activeTab === "categories" ? "active" : ""} onClick={() => setActiveTab("categories")}>Manage Categories</button>
      </div>

      {activeTab === "general" ? (
        <section className="settings-card">
          <div className="settings-card-copy">
            <div style={{ fontFamily: serif, fontSize: 21, fontWeight: 500 }}>Total wedding budget</div>
            <p>This anchors every category and your remaining-spend calculations. Changes save automatically.</p>
          </div>
          <div style={{ maxWidth: 260 }}>
            <Field label="Overall budget (CAD)">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: 9, color: forest, fontFamily: serif }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={overallBudget === 0 ? "" : overallBudget}
                  onChange={(event) => setOverallBudget(Math.max(0, Number(event.target.value) || 0))}
                  style={{ ...inputStyle, height: 40, paddingLeft: 28, fontSize: 15 }}
                />
              </div>
            </Field>
          </div>
        </section>
      ) : (
        <section className="settings-card category-settings-card">
          <div className="category-settings-heading">
            <div>
              <div style={{ fontFamily: serif, fontSize: 21, fontWeight: 500 }}>Your budget categories</div>
              <p>Hide a category you do not need. Default categories stay available here and cannot be renamed or deleted.</p>
            </div>
            {!showAddCat && <button type="button" onClick={() => setShowAddCat(true)} style={primaryBtnStyle}>+ Custom category</button>}
          </div>

          {showAddCat && (
            <div className="add-category-row">
              <input value={newCatName} onChange={(event) => setNewCatName(event.target.value)} placeholder="e.g. Late-night snacks" style={{ ...inputStyle, height: 38 }} autoFocus onKeyDown={(event) => event.key === "Enter" && addCategory()} />
              <button type="button" onClick={addCategory} style={{ ...primaryBtnStyle, height: 38 }}>Add category</button>
              <button type="button" onClick={() => { setShowAddCat(false); setNewCatName(""); }} style={{ ...ghostBtnStyle, height: 38 }}>Cancel</button>
            </div>
          )}

          <div className="settings-category-list">
            {categories.map((category) => {
              const protectedCategory = isDefaultCategory(category);
              const visible = !hiddenCategoryIds.includes(category.id);
              const editing = editingCategoryId === category.id;
              return (
                <div className="settings-category-row" key={category.id}>
                  <label className="visibility-toggle">
                    <input type="checkbox" checked={visible} onChange={() => toggleCategoryVisibility(category.id)} />
                    <span className="toggle-track"><span /></span>
                    <span className="sr-only">{visible ? "Hide" : "Show"} {category.name}</span>
                  </label>
                  <div className="category-name-cell">
                    {editing ? (
                      <input value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} style={{ ...inputStyle, height: 34 }} autoFocus onKeyDown={(event) => event.key === "Enter" && renameCategory(category.id)} />
                    ) : (
                      <>
                        <div style={{ fontWeight: 500, color: visible ? ink : "#999184" }}>{category.name}</div>
                        <div className="category-type">{protectedCategory ? "Default category" : "Custom category"}{!visible ? " · Hidden" : ""}</div>
                      </>
                    )}
                  </div>
                  <div className="category-actions">
                    {editing ? (
                      <>
                        <button type="button" onClick={() => renameCategory(category.id)} style={iconTextBtnStyle}>Save</button>
                        <button type="button" onClick={() => { setEditingCategoryId(null); setEditingCategoryName(""); }} style={iconTextBtnStyle}>Cancel</button>
                      </>
                    ) : !protectedCategory ? (
                      <>
                        <button type="button" onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); }} style={iconTextBtnStyle}>Rename</button>
                        <button type="button" onClick={() => removeCategory(category.id)} style={{ ...iconTextBtnStyle, color: rose }}>Delete</button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function CategoryPage({ category, items, totals, updateCategoryBudget, onBack, onEditItem, onDeleteItem, onRemoveCategory }) {
  const budget = Number(category.budget) || 0;
  const remaining = budget - totals.paid;
  return (
    <div>
      <button type="button" className="breadcrumb" onClick={onBack}>Summary <span>›</span> {category.name}</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12 }}>
        <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500 }}>{category.name}</div>
        {!isDefaultCategory(category) && (
          <button onClick={() => onRemoveCategory(category.id)} style={ghostBtnStyle}>Delete category</button>
        )}
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
          No expenses logged in this category yet. Use “Log wedding expense” in the sidebar to add the first one.
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
    <div style={{ background: "#fffdf7", padding: 24 }}>
      <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, marginBottom: 16 }}>
        {editingId ? "Edit wedding expense" : "Log wedding expense"}
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
          <button type="submit" style={primaryBtnStyle}>{editingId ? "Save changes" : "Log expense"}</button>
          <button type="button" onClick={onCancel} style={ghostBtnStyle}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone, actionLabel, onAction }) {
  const color = tone === "danger" ? rose : forest;
  return (
    <div className="scrap-card" style={{ background: tone === "danger" ? roseSoft : forestSoft, borderRadius: 3, padding: "16px 18px" }}>
      <div style={{ fontSize: 12, color: "#5c5c53", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#7a7a70", marginTop: 4 }}>{sub}</div>}
      {actionLabel && <button type="button" onClick={onAction} style={{ ...iconTextBtnStyle, padding: "7px 0 0", fontSize: 11 }}>{actionLabel} →</button>}
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
