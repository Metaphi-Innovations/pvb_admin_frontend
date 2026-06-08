"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Pagination } from "@/components/listing/Pagination";
import { HrStatusBadge } from "../../components/HrStatusBadge";
import { Eye, History, Pencil, Plus, Search, X } from "lucide-react";
import {
  appendPolicyAudit,
  CITY_CATEGORIES,
  dedupeCityMappings,
  formatStatesCovered,
  getCityPreviewFromMappings,
  getMissingCityCategoryTypes,
  groupMappedCitiesByState,
  loadPolicyAuditLog,
  renameCityInCategoryRecords,
  renameStateInCategoryRecords,
  renameCityInMappings,
  renameStateInMappings,
  stampNew,
  stampUpdate,
  type CityCategory,
  type CityCategoryMaster,
  type MappedCityRef,
} from "../tada-policy-data";
import {
  addMockCity,
  addMockState,
  getActiveCitiesForState,
  getActiveMockStateNames,
  getCitiesForState,
  getMockStateByName,
  updateMockCity,
  updateMockState,
  type MockCityEntry,
} from "../stateCityMockData";
import { PolicyField, compactSelect, SHEET_SELECT_CONTENT_PROPS } from "./PolicyMasterTable";

type MapMode = "add" | "edit";
type SheetMode =
  | MapMode
  | "view"
  | "addState"
  | "editState"
  | "addCity"
  | "manageCities"
  | "editCity"
  | null;

function cityRefKey(m: MappedCityRef): string {
  return `${m.state.trim().toLowerCase()}|${m.city.trim().toLowerCase()}`;
}

function mergeMappedCities(existing: MappedCityRef[], add: MappedCityRef): MappedCityRef[] {
  const key = cityRefKey(add);
  if (existing.some((m) => cityRefKey(m) === key)) return existing;
  return [...existing, add];
}

function ViewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-border/40 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function CityCategorySection({
  records,
  onSave,
}: {
  records: CityCategoryMaster[];
  onSave: (list: CityCategoryMaster[]) => void;
}) {
  const [mockVersion, setMockVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mode, setMode] = useState<SheetMode>(null);
  const [returnMode, setReturnMode] = useState<MapMode>("add");
  const [active, setActive] = useState<CityCategoryMaster | null>(null);
  const [form, setForm] = useState<Partial<CityCategoryMaster>>({});
  const [selectedState, setSelectedState] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [mapCategoryId, setMapCategoryId] = useState<number | null>(null);

  const [stateForm, setStateForm] = useState({ name: "", status: "active" as const, remarks: "" });
  const [newCityName, setNewCityName] = useState("");
  const [newCityStatus, setNewCityStatus] = useState<"active" | "inactive">("active");
  const [newCityRemarks, setNewCityRemarks] = useState("");
  const [editingCity, setEditingCity] = useState<MockCityEntry | null>(null);
  const [editCityForm, setEditCityForm] = useState({ name: "", status: "active" as const, remarks: "" });

  const stateNames = useMemo(() => getActiveMockStateNames(), [mockVersion]);
  const missingTypes = useMemo(() => getMissingCityCategoryTypes(records), [records]);
  const allCategoryTypesExist = missingTypes.length === 0 && records.length >= CITY_CATEGORIES.length;

  const mappedCities = form.mappedCities ?? [];

  const filtered = useMemo(() => {
    let rows = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => {
        const names = r.mappedCities.map((m) => m.city).join(" ");
        const stateNames = r.mappedCities.map((m) => m.state).join(" ");
        return (
          r.categoryName.toLowerCase().includes(q) ||
          names.toLowerCase().includes(q) ||
          stateNames.toLowerCase().includes(q)
        );
      });
    }
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [records, search, statusFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const citiesInState = useMemo(() => {
    if (!selectedState) return [];
    const q = citySearch.trim().toLowerCase();
    return getActiveCitiesForState(selectedState).filter((c) => !q || c.toLowerCase().includes(q));
  }, [selectedState, citySearch, mockVersion]);

  const manageCityRows = useMemo(() => {
    if (!selectedState) return [];
    return getCitiesForState(selectedState);
  }, [selectedState, mockVersion]);

  const refreshMock = () => setMockVersion((v) => v + 1);

  const isMapMode = (m: SheetMode): m is MapMode => m === "add" || m === "edit";

  const goBackToMap = () => setMode(returnMode);

  const resetMapForm = (row?: CityCategoryMaster) => {
    const names = getActiveMockStateNames();
    setForm(
      row
        ? { ...row, mappedCities: [...row.mappedCities] }
        : { categoryName: missingTypes[0] ?? "Other", mappedCities: [], remarks: "", status: "active" },
    );
    setSelectedState(names[0] ?? "");
    setCitySearch("");
    setNewCityName("");
    setNewCityRemarks("");
    setError(null);
  };

  const openMap = (row?: CityCategoryMaster) => {
    if (row) {
      setActive(row);
      resetMapForm(row);
      setMode("edit");
    } else {
      setActive(null);
      resetMapForm();
      setMode("add");
    }
  };

  const openView = (row: CityCategoryMaster) => {
    setActive(row);
    setMode("view");
  };

  const openNested = (nested: SheetMode, parent: MapMode) => {
    setReturnMode(parent);
    setError(null);
    setMode(nested);
  };

  const isCityMapped = (state: string, city: string) =>
    mappedCities.some((m) => cityRefKey(m) === cityRefKey({ state, city }));

  const toggleCity = (state: string, city: string, checked: boolean) => {
    setForm((f) => {
      const list = f.mappedCities ?? [];
      const key = cityRefKey({ state, city });
      if (checked) {
        return list.some((m) => cityRefKey(m) === key)
          ? f
          : { ...f, mappedCities: [...list, { state, city }] };
      }
      return { ...f, mappedCities: list.filter((m) => cityRefKey(m) !== key) };
    });
  };

  const removeMappedCity = (ref: MappedCityRef) => {
    const key = cityRefKey(ref);
    setForm((f) => ({
      ...f,
      mappedCities: (f.mappedCities ?? []).filter((m) => cityRefKey(m) !== key),
    }));
  };

  const handleSaveState = () => {
    try {
      if (!stateForm.name.trim()) {
        setError("State name is required.");
        return;
      }
      if (mode === "addState") {
        const entry = addMockState(stateForm.name, stateForm.status, stateForm.remarks);
        refreshMock();
        setSelectedState(entry.name);
        appendPolicyAudit({
          user: "Admin",
          action: "Created",
          entity: "State (City Category)",
          details: entry.name,
        });
        goBackToMap();
        return;
      }
      if (mode === "editState" && selectedState) {
        const result = updateMockState(selectedState, {
          name: stateForm.name,
          status: stateForm.status,
          remarks: stateForm.remarks,
        });
        if (result.renamedFrom && result.renamedTo) {
          onSave(renameStateInCategoryRecords(records, result.renamedFrom, result.renamedTo));
          setForm((f) => ({
            ...f,
            mappedCities: renameStateInMappings(f.mappedCities ?? [], result.renamedFrom!, result.renamedTo!),
          }));
          setSelectedState(result.renamedTo);
        } else if (result.entry.status === "inactive") {
          const active = getActiveMockStateNames().filter((n) => n !== result.entry.name);
          setSelectedState(active[0] ?? "");
        } else {
          setSelectedState(result.entry.name);
        }
        refreshMock();
        appendPolicyAudit({
          user: "Admin",
          action: "Updated",
          entity: "State (City Category)",
          details: result.entry.name,
        });
        goBackToMap();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save state.");
    }
  };

  const handleAddNewCity = () => {
    if (!selectedState) {
      setError("Select a state first.");
      return;
    }
    if (!newCityName.trim()) {
      setError("Enter city name.");
      return;
    }
    try {
      const entry = addMockCity(selectedState, newCityName, newCityStatus, newCityRemarks);
      refreshMock();
      if (newCityStatus === "active") {
        setForm((f) => ({
          ...f,
          mappedCities: mergeMappedCities(f.mappedCities ?? [], {
            state: selectedState,
            city: entry.city,
          }),
        }));
      }
      appendPolicyAudit({
        user: "Admin",
        action: "Created",
        entity: "City (City Category)",
        details: `${entry.city}, ${selectedState}`,
      });
      setNewCityName("");
      setNewCityRemarks("");
      setError(null);
      goBackToMap();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add city.");
    }
  };

  const handleSaveEditCity = () => {
    if (!editingCity || !selectedState) return;
    try {
      const result = updateMockCity(selectedState, editingCity.city, {
        city: editCityForm.name,
        status: editCityForm.status,
        remarks: editCityForm.remarks,
      });
      if (result.renamedFrom && result.renamedTo) {
        onSave(renameCityInCategoryRecords(records, selectedState, result.renamedFrom, result.renamedTo));
        setForm((f) => ({
          ...f,
          mappedCities: renameCityInMappings(
            f.mappedCities ?? [],
            selectedState,
            result.renamedFrom!,
            result.renamedTo!,
          ),
        }));
      }
      refreshMock();
      appendPolicyAudit({
        user: "Admin",
        action: "Updated",
        entity: "City (City Category)",
        details: `${result.entry.city}, ${selectedState}`,
      });
      setEditingCity(null);
      setMode("manageCities");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update city.");
    }
  };

  const handleDeactivateCity = (row: MockCityEntry) => {
    try {
      updateMockCity(row.state, row.city, {
        status: row.status === "active" ? "inactive" : "active",
      });
      refreshMock();
      appendPolicyAudit({
        user: "Admin",
        action: row.status === "active" ? "Deactivated" : "Activated",
        entity: "City (City Category)",
        details: `${row.city}, ${row.state}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update city status.");
    }
  };

  const persist = () => {
    if (!form.categoryName) {
      setError("Category is required.");
      return;
    }
    const duplicate = records.find(
      (r) => r.categoryName === form.categoryName && r.id !== active?.id,
    );
    if (duplicate) {
      setError(`${form.categoryName} category already exists.`);
      return;
    }
    const id = mode === "add" ? Math.max(0, ...records.map((r) => r.id)) + 1 : active!.id;
    const base = {
      categoryName: form.categoryName as CityCategory,
      mappedCities: form.mappedCities ?? [],
      remarks: form.remarks ?? "",
    };
    let merged =
      mode === "add"
        ? [...records, stampNew(base, id)]
        : records.map((r) =>
            r.id === id
              ? stampUpdate({ ...active!, ...base, status: form.status ?? active!.status })
              : r,
          );
    merged = dedupeCityMappings(merged, id, base.mappedCities);
    onSave(merged);
    appendPolicyAudit({
      user: "Admin",
      action: mode === "add" ? "Created" : "Updated",
      entity: "City Category",
      details: `${base.categoryName} — ${base.mappedCities.length} cities mapped`,
    });
    setMode(null);
  };

  const toggleStatus = (row: CityCategoryMaster) => {
    const next = stampUpdate({ ...row, status: row.status === "active" ? "inactive" : "active" });
    onSave(records.map((r) => (r.id === row.id ? next : r)));
  };

  const auditLog = loadPolicyAuditLog().filter((e) => e.entity.includes("City"));

  const takenCategories = records
    .filter((r) => r.id !== active?.id)
    .map((r) => r.categoryName);

  const viewGroups = active ? groupMappedCitiesByState(active.mappedCities) : {};

  const mapSheetOpen =
    mode === "add" ||
    mode === "edit" ||
    mode === "addState" ||
    mode === "editState" ||
    mode === "addCity" ||
    mode === "manageCities" ||
    mode === "editCity";

  const sheetTitle = () => {
    switch (mode) {
      case "addState":
        return "Add New State";
      case "editState":
        return "Edit State";
      case "addCity":
        return "Add New City";
      case "manageCities":
        return `Manage Cities — ${selectedState}`;
      case "editCity":
        return "Edit City";
      case "add":
        return "Add City Category";
      case "edit":
        return `Edit — ${form.categoryName ?? "City Category"}`;
      default:
        return "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-section-title text-navy-900">City Category Master</h2>
          <p className="text-helper text-muted-foreground mt-0.5">
            Map cities to Mega Metro / Metro / Other. Manage states and cities internally. Unmapped cities default to
            Other in claims.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}>
            <History className="w-3.5 h-3.5" /> Audit
          </Button>
          {allCategoryTypesExist ? (
            <>
              <Select
                value={String(mapCategoryId ?? records[0]?.id ?? "")}
                onValueChange={(v) => setMapCategoryId(Number(v))}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {records.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)} className="text-xs">
                      {r.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => {
                  const row = records.find((r) => r.id === (mapCategoryId ?? records[0]?.id));
                  if (row) openMap(row);
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Map Cities
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => openMap()}>
              <Plus className="w-3.5 h-3.5" /> Add Category
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Workflow: <strong>Category</strong> → <strong>State</strong> → <strong>Multi-select cities</strong> → Save.
        Use <strong>+ Add New State</strong> / <strong>+ Add New City</strong> / <strong>Manage Cities</strong> as needed.
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 pl-7 max-w-xs text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="active" className="text-xs">Active</SelectItem>
            <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="page-shell overflow-x-auto">
        <table className="w-full text-xs min-w-[1000px]">
          <thead className="bg-muted/30 border-b">
            <tr>
              {[
                "Category Name",
                "States Covered",
                "Total Cities",
                "City Preview",
                "Status",
                "Updated By",
                "Updated On",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row) => (
              <tr key={row.id} className="border-b hover:bg-brand-50/30">
                <td className="px-3 py-2 font-medium">{row.categoryName}</td>
                <td className="px-3 py-2">{formatStatesCovered(row.mappedCities)}</td>
                <td className="px-3 py-2">{row.mappedCities.length}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {getCityPreviewFromMappings(row.mappedCities, 2)}
                </td>
                <td className="px-3 py-2">
                  <HrStatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2">{row.updatedBy}</td>
                <td className="px-3 py-2">{row.updatedAt}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(row)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMap(row)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-amber-600"
                      onClick={() => toggleStatus(row)}
                      title="Deactivate"
                    >
                      <span className="text-[9px] font-bold">{row.status === "active" ? "OFF" : "ON"}</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageSize={pageSize}
          totalRecords={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </div>

      <Sheet open={mode === "view"} onOpenChange={(o) => !o && setMode(null)}>
        {mode === "view" && active && (
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>View City Category</SheetTitle>
            </SheetHeader>
            <SheetBody className="space-y-3">
              <ViewRow label="Category Name" value={active.categoryName} />
              <ViewRow label="Status" value={<HrStatusBadge status={active.status} />} />
              <ViewRow label="Total Cities" value={active.mappedCities.length} />
              <ViewRow label="States Covered" value={formatStatesCovered(active.mappedCities, 10)} />
              <div className="pt-2">
                <p className="text-xs font-semibold text-navy-900 mb-2">{active.categoryName}</p>
                <div className="space-y-3">
                  {Object.entries(viewGroups).map(([state, cities]) => (
                    <div key={state}>
                      <p className="text-xs font-semibold text-navy-900 mb-1">{state}:</p>
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                        {cities.map((c) => (
                          <li key={`${state}-${c}`}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {!Object.keys(viewGroups).length && (
                    <p className="text-xs text-muted-foreground">No cities mapped.</p>
                  )}
                </div>
              </div>
              {active.remarks && <ViewRow label="Remarks" value={active.remarks} />}
            </SheetBody>
            <SheetFooter>
              <Button variant="outline" size="sm" onClick={() => setMode(null)}>Close</Button>
              <Button size="sm" onClick={() => openMap(active)}>Edit</Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>

      <Sheet
        open={mapSheetOpen}
        onOpenChange={(o) => {
          if (!o) setMode(null);
        }}
      >
        {mapSheetOpen && (
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{sheetTitle()}</SheetTitle>
            </SheetHeader>
            <SheetBody className="space-y-3">
              {error && <p className="text-xs text-red-600">{error}</p>}

              {isMapMode(mode) && (
                <>
                  <PolicyField label="1. Category" required>
                    <Select
                      modal={false}
                      value={form.categoryName ?? ""}
                      onValueChange={(v) => setForm((f) => ({ ...f, categoryName: v as CityCategory }))}
                    >
                      <SelectTrigger className={compactSelect()}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent {...SHEET_SELECT_CONTENT_PROPS}>
                        {CITY_CATEGORIES.map((t) => (
                          <SelectItem
                            key={t}
                            value={t}
                            className="text-xs"
                            disabled={takenCategories.includes(t)}
                          >
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PolicyField>

                  <PolicyField label="2. State" required>
                    <div className="flex gap-2 items-center">
                      <Select modal={false} value={selectedState} onValueChange={setSelectedState}>
                        <SelectTrigger className={compactSelect("flex-1")}>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent {...SHEET_SELECT_CONTENT_PROPS}>
                          {stateNames.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-[10px] shrink-0"
                        onClick={() => {
                          setStateForm({ name: "", status: "active", remarks: "" });
                          openNested("addState", mode);
                        }}
                      >
                        <Plus className="w-3 h-3" /> State
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-[10px] shrink-0"
                        disabled={!selectedState}
                        onClick={() => {
                          const st = getMockStateByName(selectedState);
                          setStateForm({
                            name: st?.name ?? selectedState,
                            status: st?.status ?? "active",
                            remarks: st?.remarks ?? "",
                          });
                          openNested("editState", mode);
                        }}
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                    </div>
                  </PolicyField>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">3. Cities (multi-select)</Label>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px]"
                          disabled={!selectedState}
                          onClick={() => {
                            setNewCityName("");
                            setNewCityStatus("active");
                            setNewCityRemarks("");
                            openNested("addCity", mode);
                          }}
                        >
                          <Plus className="w-3 h-3" /> City
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px]"
                          disabled={!selectedState}
                          onClick={() => openNested("manageCities", mode)}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 min-h-[28px] p-2 rounded-lg border bg-muted/10">
                      {mappedCities.length === 0 && (
                        <span className="text-[11px] text-muted-foreground">No cities mapped yet</span>
                      )}
                      {mappedCities.map((m) => (
                        <Badge key={cityRefKey(m)} variant="secondary" className="text-[10px] gap-1 pl-2 pr-1">
                          {m.city}
                          <span className="text-muted-foreground">({m.state})</span>
                          <button type="button" onClick={() => removeMappedCity(m)}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>

                    {selectedState && (
                      <>
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            value={citySearch}
                            onChange={(e) => setCitySearch(e.target.value)}
                            placeholder="Search cities in state…"
                            className="h-8 pl-7 text-xs"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                          {citiesInState.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground">
                              No active cities — add via + City or Manage Cities.
                            </p>
                          ) : (
                            citiesInState.map((city) => (
                              <label
                                key={city}
                                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/30 p-1 rounded"
                              >
                                <Checkbox
                                  checked={isCityMapped(selectedState, city)}
                                  onCheckedChange={(v) => toggleCity(selectedState, city, !!v)}
                                />
                                <span>{city}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2 rounded border">
                    <Label className="text-xs">Mapping Active</Label>
                    <Switch
                      checked={(form.status ?? "active") === "active"}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, status: v ? "active" : "inactive" }))}
                    />
                  </div>

                  <PolicyField label="Remarks">
                    <Input
                      className="h-8 text-xs"
                      value={form.remarks ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                    />
                  </PolicyField>
                </>
              )}

              {(mode === "addState" || mode === "editState") && (
                <div className="space-y-3">
                  <PolicyField label="State Name" required>
                    <Input
                      className="h-8 text-xs"
                      value={stateForm.name}
                      onChange={(e) => setStateForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Rajasthan"
                    />
                  </PolicyField>
                  <div className="flex items-center justify-between p-2 rounded border">
                    <Label className="text-xs">Active</Label>
                    <Switch
                      checked={stateForm.status === "active"}
                      onCheckedChange={(v) =>
                        setStateForm((f) => ({ ...f, status: v ? "active" : "inactive" }))
                      }
                    />
                  </div>
                  <PolicyField label="Remarks">
                    <Input
                      className="h-8 text-xs"
                      value={stateForm.remarks}
                      onChange={(e) => setStateForm((f) => ({ ...f, remarks: e.target.value }))}
                    />
                  </PolicyField>
                </div>
              )}

              {mode === "addCity" && (
                <div className="space-y-3">
                  <PolicyField label="State (auto-filled)">
                    <Input disabled className="h-8 text-xs bg-muted/20" value={selectedState} />
                  </PolicyField>
                  <PolicyField label="City Name" required>
                    <Input
                      className="h-8 text-xs"
                      value={newCityName}
                      onChange={(e) => setNewCityName(e.target.value)}
                      placeholder="e.g. Jaipur"
                    />
                  </PolicyField>
                  <div className="flex items-center justify-between p-2 rounded border">
                    <Label className="text-xs">Active</Label>
                    <Switch
                      checked={newCityStatus === "active"}
                      onCheckedChange={(v) => setNewCityStatus(v ? "active" : "inactive")}
                    />
                  </div>
                  <PolicyField label="Remarks">
                    <Input
                      className="h-8 text-xs"
                      value={newCityRemarks}
                      onChange={(e) => setNewCityRemarks(e.target.value)}
                    />
                  </PolicyField>
                </div>
              )}

              {mode === "manageCities" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    All cities under <strong>{selectedState}</strong>
                  </p>
                  <div className="border rounded-lg overflow-x-auto max-h-[360px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30 border-b sticky top-0">
                        <tr>
                          {["City Name", "Status", "Updated By", "Updated On", "Actions"].map((h) => (
                            <th key={h} className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {manageCityRows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">
                              No cities in this state.
                            </td>
                          </tr>
                        ) : (
                          manageCityRows.map((row) => (
                            <tr key={`${row.state}-${row.city}`} className="border-b">
                              <td className="px-2 py-1.5 font-medium">{row.city}</td>
                              <td className="px-2 py-1.5">
                                <HrStatusBadge status={row.status} />
                              </td>
                              <td className="px-2 py-1.5">{row.updatedBy}</td>
                              <td className="px-2 py-1.5">{row.updatedAt}</td>
                              <td className="px-2 py-1.5">
                                <div className="flex gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      setEditingCity(row);
                                      setEditCityForm({
                                        name: row.city,
                                        status: row.status,
                                        remarks: row.remarks,
                                      });
                                      setMode("editCity");
                                    }}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-amber-600"
                                    onClick={() => handleDeactivateCity(row)}
                                    title={row.status === "active" ? "Deactivate" : "Activate"}
                                  >
                                    <span className="text-[8px] font-bold">
                                      {row.status === "active" ? "OFF" : "ON"}
                                    </span>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {mode === "editCity" && editingCity && (
                <div className="space-y-3">
                  <PolicyField label="State">
                    <Input disabled className="h-8 text-xs bg-muted/20" value={selectedState} />
                  </PolicyField>
                  <PolicyField label="City Name" required>
                    <Input
                      className="h-8 text-xs"
                      value={editCityForm.name}
                      onChange={(e) => setEditCityForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </PolicyField>
                  <div className="flex items-center justify-between p-2 rounded border">
                    <Label className="text-xs">Active</Label>
                    <Switch
                      checked={editCityForm.status === "active"}
                      onCheckedChange={(v) =>
                        setEditCityForm((f) => ({ ...f, status: v ? "active" : "inactive" }))
                      }
                    />
                  </div>
                  <PolicyField label="Remarks">
                    <Input
                      className="h-8 text-xs"
                      value={editCityForm.remarks}
                      onChange={(e) => setEditCityForm((f) => ({ ...f, remarks: e.target.value }))}
                    />
                  </PolicyField>
                </div>
              )}
            </SheetBody>

            <SheetFooter>
              {isMapMode(mode) && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMode(null)}>Cancel</Button>
                  <Button size="sm" onClick={persist}>Save Mapping</Button>
                </>
              )}
              {(mode === "addState" || mode === "editState") && (
                <>
                  <Button variant="outline" size="sm" onClick={goBackToMap}>Back</Button>
                  <Button size="sm" onClick={handleSaveState}>Save State</Button>
                </>
              )}
              {mode === "addCity" && (
                <>
                  <Button variant="outline" size="sm" onClick={goBackToMap}>Back</Button>
                  <Button size="sm" onClick={handleAddNewCity}>Save City & Map</Button>
                </>
              )}
              {mode === "manageCities" && (
                <Button variant="outline" size="sm" onClick={goBackToMap}>Back to Mapping</Button>
              )}
              {mode === "editCity" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMode("manageCities")}>Back</Button>
                  <Button size="sm" onClick={handleSaveEditCity}>Save City</Button>
                </>
              )}
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>

      <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Audit — City Category</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {auditLog.map((e) => (
              <div key={e.id} className="text-xs p-2 border rounded mb-1">
                {e.action} — {e.details}
              </div>
            ))}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
