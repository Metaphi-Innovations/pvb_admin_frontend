"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle2, XCircle } from "lucide-react";
import type { Employee } from "@/app/(app)/user-management/employee/employee-data";
import SampleOrderForm, {
	type SalesOrderFormValues,
	validateSalesOrderForm,
} from "../components/SampleOrderForm";
import {
	type ProductCatalogItem,
	todayStr,
	setDynamicProducts,
} from "../orders-data";
import {
	useNextSampleOrderNumber,
	useCreateSampleOrder,
} from "@/hooks/sales/use-sample-orders";
import {
	useSalesmenDropdown,
	useProductsDropdown,
} from "@/hooks/sales/use-sales-orders";

export default function AddSalesOrderPage() {
	const router = useRouter();
	const [salesmen, setSalesmen] = useState<Employee[]>([]);
	const [products, setProducts] = useState<ProductCatalogItem[]>([]);
	const [toast, setToast] = useState<{
		msg: string;
		type: "success" | "error";
	} | null>(null);

	const [form, setForm] = useState<SalesOrderFormValues>({
		orderDate: todayStr(),
		salesManId: null,
		remarks: "",
		status: "confirmed",
		lineItems: [],
		warehouseId: null,
		warehouseName: "",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const { data: nextNumber } = useNextSampleOrderNumber();
	const createMutation = useCreateSampleOrder();

	const { data: salesmanData } = useSalesmenDropdown();
	const { data: productData } = useProductsDropdown();

	const orderNumber = nextNumber || "SMO/27/2627/000001";

	useEffect(() => {
		if (salesmanData) {
			const mapped = salesmanData.map((s: any) => ({
				id: s.user_id,
				employeeId: s.employee_id || s.username || "",
				employeeCode: s.employee_id || s.username || "",
				firstName: s.first_name || "",
				lastName: s.last_name || "",
				fullName: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.username || "",
				email: s.email || "",
				role: s.role?.role_name || s.role_type || "",
				status: s.is_active ? "active" : "inactive",
				department: s.department?.department_name || "",
			}));
			setSalesmen(mapped as any);
		}
	}, [salesmanData]);

	useEffect(() => {
		if (productData) {
			const mapped = productData.map((p: any) => ({
				id: p.product_id,
				code: p.product_code,
				name: p.product_name,
				sku: p.sku || "",
				stock: Number(p.stock || p.available_stock || 0),
				sellingPrice: Number(p.mrp || 0),
				gstRate: String(p.gst_rate?.gstPercentage || 18),
				category: p.category?.categoryName || "",
				segment: p.segment?.segment_name || "",
				packSize: Number(p.unit_per_packing || 1),
			}));
			setProducts(mapped as any);
			setDynamicProducts(mapped as any);
		} else {
			setDynamicProducts(null);
		}
	}, [productData]);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3200);
		return () => clearTimeout(t);
	}, [toast]);

	const handleSave = (asDraft: boolean) => {
		const e = validateSalesOrderForm(form);
		setErrors(e);
		if (Object.keys(e).length > 0) {
			setToast({ msg: "Please fix the errors before saving.", type: "error" });
			return;
		}

		createMutation.mutate(
			{
				form,
				options: {
					orderNo: orderNumber,
					status: asDraft ? "draft" : "confirmed",
				},
			},
			{
				onSuccess: () => {
					setToast({
						msg: asDraft
							? "Sample Order saved as draft."
							: "Sample Order submitted for approval.",
						type: "success",
					});
					setTimeout(() => router.push("/sales/sample-order"), 1000);
				},
				onError: () => {
					setToast({ msg: "Failed to submit Sample Order.", type: "error" });
				},
			}
		);
	};

	return (
		<FormContainer
			title="Add Sample Order"
			description="Sales → Sample Orders → New Order"
			onBack={() => router.push("/sales/sample-order")}
			onCancel={() => router.push("/sales/sample-order")}
			cancelLabel="Discard"
			noCard={true}
			actions={
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="h-8 text-xs"
						onClick={() => handleSave(true)}
						disabled={createMutation.isPending}
					>
						Save Draft
					</Button>
					<Button
						size="sm"
						className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
						onClick={() => handleSave(false)}
						disabled={createMutation.isPending}
					>
						<Save className="w-3.5 h-3.5" /> Submit Order
					</Button>
				</div>
			}
		>
			<SampleOrderForm
				mode="add"
				orderNumber={orderNumber}
				form={form}
				onChange={setForm}
				errors={errors}
				salesmen={salesmen}
				products={products}
			/>

			{toast && (
				<div
					className={cn(
						"fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
						toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
					)}
				>
					{toast.type === "success" ? (
						<CheckCircle2 className="w-4 h-4" />
					) : (
						<XCircle className="w-4 h-4" />
					)}
					{toast.msg}
				</div>
			)}
		</FormContainer>
	);
}
