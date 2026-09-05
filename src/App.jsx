import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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
function fieldConfigFor(catId) {
  return CATEGORY_FIELD_CONFIG[catId] || DEFAULT_FIELD_CONFIG;
}

const STORAGE_KEY = "wedding-budget-tracker-v2";
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

function emptyItemForm(catId) {
  const cfg = fieldConfigFor(catId);
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

export default function WeddingBudgetTracker() {
  const [setupComplete, setSetupComplete] = useState(false);
  const [overallBudget, setOverallBudget] = useState(0);
  const [guestCount, setGuestCount] = useState("");
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
  const [budgetLocked, setBudgetLocked] = useState(true);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [form, setForm] = useState(emptyItemForm(DEFAULT_CATEGORIES[0].id));
  const [editingId, setEditingId] = useState(null);
  const [itemError, setItemError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        let value = null;

        // Use the host app's storage API when available; otherwise fall back
        // to localStorage so this component also works in a normal browser.
        if (window.storage && typeof window.storage.get === "function") {
          const res = await window.storage.get(STORAGE_KEY, false);
          value = res?.value ?? null;
        } else if (typeof window.localStorage !== "undefined") {
          value = window.localStorage.getItem(STORAGE_KEY);
        }

        if (!cancelled && value) {
          const data = JSON.parse(value);
          setSetupComplete(Boolean(data.setupComplete));
          setOverallBudget(typeof data.overallBudget === "number" ? data.overallBudget : 0);
          setGuestCount(data.guestCount == null ? "" : String(data.guestCount));
          if (Array.isArray(data.categories) && data.categories.length) setCategories(data.categories);
          if (Array.isArray(data.items)) setItems(data.items);
        }
      } catch (e) {
        // First run or unreadable saved data: start with a clean state.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setSaveState("saving");

    const payload = JSON.stringify({
      setupComplete,
      overallBudget,
      guestCount,
      categories,
      items,
    });

    const t = setTimeout(async () => {
      try {
        if (window.storage && typeof window.storage.set === "function") {
          await window.storage.set(STORAGE_KEY, payload, false);
        } else if (typeof window.localStorage !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, payload);
        }
        setSaveState("saved");
      } catch (e) {
        setSaveState("error");
      }
    }, 350);

    return () => clearTimeout(t);
  }, [setupComplete, overallBudget, guestCount, categories, items, loaded]);

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

  function updateCategoryBudget(id, value) {
    setCategories((cats) => cats.map((c) => (c.id === id ? { ...c, budget: value } : c)));
  }

  function splitRemainingEvenly() {
    if (categories.length === 0) return;
    const share = Math.max(0, unassigned) / categories.length;
    setCategories((cats) => cats.map((c) => ({ ...c, budget: (Number(c.budget) || 0) + share })));
  }

  function addCategory() {
    const name = newCatName.trim();
    if (!name) return;
    const id = uid();
    setCategories((cats) => [...cats, { id, name, budget: 0 }]);
    setNewCatName("");
    setShowAddCat(false);
    setManageCategoriesOpen(true);
    setPage("summary");
  }

  function removeCategory(id) {
    if (items.some((it) => it.categoryId === id)) {
      if (!window.confirm("This category has items in it. Delete it and all its items?")) return;
    }
    setCategories((cats) => cats.filter((c) => c.id !== id));
    setItems((its) => its.filter((it) => it.categoryId !== id));
    if (page === id) setPage("summary");
  }

  function openAddPanel(catId) {
    setForm(emptyItemForm(catId || categories[0]?.id));
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
    const cfg = fieldConfigFor(catId);
    setForm((f) => ({
      ...f,
      categoryId: catId,
      quantity: f.quantity && f.quantity !== "" ? f.quantity : String(cfg.defaultQty),
    }));
  }

  function saveItem(e) {
    if (e && e.preventDefault) e.preventDefault();
    setItemError("");
    if (!form.description.trim() || !form.categoryId) {
      setItemError("Enter a description for this item.");
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
    if (editingId) {
      setItems((its) => its.map((it) => (it.id === editingId ? { ...it, ...payload } : it)));
    } else {
      setItems((its) => [...its, { id: uid(), ...payload }]);
    }
    setForm(emptyItemForm(form.categoryId));
    setEditingId(null);
    setItemError("");
    setAddOpen(false);
  }

  function deleteItem(id) {
    setItems((its) => its.filter((it) => it.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setAddOpen(false);
    }
  }

  function finishSetup(e) {
    if (e && e.preventDefault) e.preventDefault();

    const budget = Number(overallBudget);
    if (!Number.isFinite(budget) || budget <= 0) {
      setSetupError("Enter your overall budget to continue.");
      return;
    }

    setSetupError("");
    setAddOpen(false);
    setPage("summary");
    setSetupComplete(true);
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
          <div style={{ display: "grid", gap: 16 }} onKeyDown={(e) => { if (e.key === "Enter") finishSetup(e); }}>
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
            <button type="button" onClick={finishSetup} style={{ ...primaryBtnStyle, height: 42, marginTop: 8 }}>
              Start planning
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeCategory = categories.find((c) => c.id === page);

  return (
    <div style={{ fontFamily: sans, background: paper, color: ink, minHeight: "100%", display: "flex" }}>
      <GoogleFontImport />

      <nav style={{
        width: navCollapsed ? 56 : 210, flexShrink: 0, borderRight: `1px solid ${line}`,
        padding: navCollapsed ? "24px 8px" : "24px 14px", background: "#FCFBF7",
        transition: "width 150ms ease, padding 150ms ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: navCollapsed ? "center" : "space-between", padding: "0 8px", marginBottom: 4 }}>
          {!navCollapsed && <div style={{ fontFamily: serif, fontSize: 19, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Wedding budget</div>}
          <button
            onClick={() => setNavCollapsed((c) => !c)}
            title={navCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={collapseBtnStyle}
          >
            {navCollapsed ? "»" : "«"}
          </button>
        </div>

        {!navCollapsed && (
          <div style={{ padding: "14px 8px", margin: "14px 0", borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#8a8a80" }}>Overall budget</span>
              <button
                onClick={() => setBudgetLocked((l) => !l)}
                title={budgetLocked ? "Edit budget" : "Done editing"}
                style={lockBtnStyle}
              >
                {budgetLocked ? "✏️" : "✓"}
              </button>
            </div>
            {budgetLocked ? (
              <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 500 }}>{CAD(overallBudget)}</div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: serif, fontSize: 15, color: forest }}>$</span>
                <input
                  type="number" min="0" autoFocus
                  value={overallBudget === 0 ? "" : overallBudget}
                  onChange={(e) => setOverallBudget(Math.max(0, Number(e.target.value) || 0))}
                  style={{ ...inputStyle, height: 30, fontSize: 13 }}
                />
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: "#8a8a80", marginBottom: 6 }}>Estimated guests</div>
              <input
                type="number" min="0"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="e.g. 120"
                style={{ ...inputStyle, height: 30, fontSize: 13 }}
              />
            </div>
          </div>
        )}

        {!navCollapsed && (
          <div style={{ fontSize: 11, color: "#8a8a80", padding: "0 8px", margin: "0 0 6px" }}>
            {saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save" : "Saved"}
          </div>
        )}

        <NavItem active={page === "summary"} onClick={() => setPage("summary")} label="Summary" collapsed={navCollapsed} glyph="S" />


        <div style={{ marginTop: 22, padding: navCollapsed ? 0 : "0 8px" }}>
          <button
            onClick={() => openAddPanel(activeCategory ? activeCategory.id : categories[0]?.id)}
            title="Add item"
            style={navCollapsed ? { ...primaryBtnStyle, width: "100%", padding: "9px 0" } : { ...primaryBtnStyle, width: "100%" }}
          >
            {navCollapsed ? "+" : "+ Add item"}
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, minWidth: 0, padding: "36px 32px 60px", overflowX: "hidden" }}>
        {addOpen && (
          <Modal onClose={() => { setAddOpen(false); setEditingId(null); setItemError(""); }}>
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
          </Modal>
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
            onAddItem={openAddPanel}
            onEditItem={openEditItem}
            onDeleteItem={deleteItem}
            onRemoveCategory={removeCategory}
            onGoToSummary={() => setPage("summary")}
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

function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(35, 38, 31, 0.45)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "48px 20px", overflowY: "auto", zIndex: 50,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 640 }}>
        {children}
      </div>
    </div>
  );
}

function NavItem({ active, onClick, label, dotColor, collapsed, glyph }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        textAlign: collapsed ? "center" : "left", justifyContent: collapsed ? "center" : "flex-start",
        background: active ? "#fff" : "transparent",
        border: active ? `1px solid ${line}` : "1px solid transparent",
        borderRadius: 7, padding: "8px 8px", fontSize: 13, fontWeight: active ? 600 : 400,
        color: ink, marginBottom: 2,
      }}
    >
      {collapsed ? (
        <span style={{ fontSize: 12, fontWeight: 600 }}>{glyph || label.charAt(0).toUpperCase()}</span>
      ) : (
        <>
          {dotColor && <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        </>
      )}
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

function CategoryPage({ category, items, totals, updateCategoryBudget, onAddItem, onEditItem, onDeleteItem, onRemoveCategory, onGoToSummary }) {
  const budget = Number(category.budget) || 0;
  const remaining = budget - totals.paid;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8a8a80", marginBottom: 14 }}>
        <button onClick={onGoToSummary} style={breadcrumbBtnStyle}>Summary</button>
        <span>/</span>
        <span style={{ color: ink, fontWeight: 500 }}>{category.name}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500 }}>{category.name}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onAddItem(category.id)} style={primaryBtnStyle}>+ Add item for {category.name}</button>
          <button onClick={() => onRemoveCategory(category.id)} style={ghostBtnStyle}>Delete category</button>
        </div>
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
          No items logged in this category yet.{" "}
          <button onClick={() => onAddItem(category.id)} style={{ ...iconTextBtnStyle, padding: 0, fontSize: 13 }}>
            Add your first item
          </button>
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
  const cfg = fieldConfigFor(form.categoryId);
  return (
    <div style={{ border: `1.5px solid ${forest}`, borderRadius: 12, background: "#fff", padding: 22, marginBottom: 28 }}>
      <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, marginBottom: 16 }}>
        {editingId ? "Edit item" : "Add an item"}
      </div>
      <div onKeyDown={(e) => { if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") onSubmit(e); }}>
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
          <button type="button" onClick={onSubmit} style={primaryBtnStyle}>{editingId ? "Save changes" : "Add item"}</button>
          <button type="button" onClick={onCancel} style={ghostBtnStyle}>Cancel</button>
        </div>
      </div>
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

const lockBtnStyle = {
  background: "transparent",
  border: "none",
  fontSize: 13,
  lineHeight: 1,
  padding: 2,
};

const collapseBtnStyle = {
  background: "transparent",
  border: `1px solid ${line}`,
  borderRadius: 6,
  color: forest,
  fontSize: 12,
  lineHeight: 1,
  width: 22,
  height: 22,
  flexShrink: 0,
  padding: 0,
};

const breadcrumbBtnStyle = {
  background: "transparent",
  border: "none",
  color: forest,
  fontSize: 12,
  fontWeight: 500,
  padding: 0,
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


