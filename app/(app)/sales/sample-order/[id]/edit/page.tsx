"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle2, XCircle } from "lucide-react";
import SampleOrderForm, {
	type SalesOrderFormValues,
	validateSalesOrderForm,
} from "../../components/SampleOrderForm";
import {
	type ProductCatalogItem,
	canEditOrder,
	orderToFormValues,
	setDynamicProducts,
} from "../../orders-data";
import type { Employee } from "@/app/(app)/user-management/employee/employee-data";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import {
	useSampleOrder,
	useUpdateSampleOrder,
} from "@/hooks/sales/use-sample-orders";
import {
	useSalesmenDropdown,
	useProductsDropdown,
	useCustomersDropdown,
} from "@/hooks/sales/use-sales-orders";

export default function EditSalesOrderPage() {
	const params = useParams();
	const router = useRouter();
	const id = String(params.id);

	const [customers, setCustomers] = useState<Customer[]>([]);
	const [salesmen, setSalesmen] = useState<Employee[]>([]);
	const [products, setProducts] = useState<ProductCatalogItem[]>([]);
	const [orderNumber, setOrderNumber] = useState("");
	const [form, setForm] = useState<SalesOrderFormValues | null>(null);
	const [auditInfo, setAuditInfo] = useState<{
		createdBy: string;
		createdDate: string;
		updatedBy: string;
		updatedDate: string;
	} | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [toast, setToast] = useState<{
		msg: string;
		type: "success" | "error";
	} | null>(null);

	const { data: order, isLoading: loadingOrder } = useSampleOrder(id);
	const updateMutation = useUpdateSampleOrder();

	const { data: salesmanData } = useSalesmenDropdown();
	const { data: productData } = useProductsDropdown();
	const { data: customerData } = useCustomersDropdown();

	useEffect(() => {
		if (customerData) {
			const mapped = customerData.map((c: any) => ({
				id: c.customer_id,
				customerCode: c.customer_code,
				customerName: c.customer_name,
				registeredLegalName: c.registered_legal_name || "",
				status: c.is_active ? "active" : "inactive",
				mobile: c.mobile_no || "",
				countryCode: c.country_code || "+91",
				email: c.email || "",
				gstin: c.gstin_no || "",
				pan: c.pan_no || "",
				registeredAddress: c.registered_gst_address || "",
				stateName: c.state?.state_name || "",
				districtName: c.district?.district_name || "",
				pincode: c.pincode || "",
				branches: (c.branches || []).map((b: any) => ({
					branchName: b.branch_name,
					isMain: b.is_main_branch,
					billingAddress: {
						address: `${b.billing_address_line_1 || ""} ${b.billing_address_line_2 || ""}`.trim(),
						city: b.billing_city || "",
						state: b.billing_state || "",
						pincode: b.billing_pincode || "",
					},
					shippingAddress: {
						address: `${b.shipping_address_line_1 || ""} ${b.shipping_address_line_2 || ""}`.trim(),
						city: b.shipping_city || "",
						state: b.shipping_state || "",
						pincode: b.shipping_pincode || "",
					},
				})),
			}));
			setCustomers(mapped as any);
		}
	}, [customerData]);

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
		if (!order) return;

		setOrderNumber(order.soNumber);
		setForm(orderToFormValues(order));
		setAuditInfo({
			createdBy: order.createdBy,
			createdDate: order.createdDate,
			updatedBy: order.updatedBy,
			updatedDate: order.updatedDate,
		});
	}, [order]);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3200);
		return () => clearTimeout(t);
	}, [toast]);

	const handleSave = (asDraft: boolean) => {
		if (!form || !order) return;

		const e = validateSalesOrderForm(form);
		setErrors(e);
		if (Object.keys(e).length > 0) {
			setToast({ msg: "Please fix the errors before saving.", type: "error" });
			return;
		}

		updateMutation.mutate(
			{
				id,
				form,
				options: {
					orderNo: orderNumber,
					status: asDraft ? "draft" : form.status,
				},
				customerDetails: customers.find((c: any) => c.id === form.customerId),
			},
			{
				onSuccess: () => {
					setToast({
						msg: asDraft
							? "Sample Order saved as draft."
							: "Sample Order updated successfully.",
						type: "success",
					});
					setTimeout(() => router.push("/sales/sample-order"), 1000);
				},
				onError: () => {
					setToast({ msg: "Failed to update Sample Order.", type: "error" });
				},
			}
		);
	};

	if (loadingOrder || !form) {
		return (
			<FormContainer
				title="Edit Sample Order"
				description="Sales → Sample Orders → Edit Order"
				onBack={() => router.push("/sales/sample-order")}
				onCancel={() => router.push("/sales/sample-order")}
				cancelLabel="Discard"
				noCard={true}
			>
				<p className="text-sm text-muted-foreground p-4">Loading order…</p>
			</FormContainer>
		);
	}

	return (
		<FormContainer
			title="Edit Sample Order"
			description="Sales → Sample Orders → Edit Order"
			onBack={() => router.push("/sales/sample-order")}
			onCancel={() => router.push("/sales/sample-order")}
			cancelLabel="Discard"
			noCard={true}
			actions={
				<div className="flex items-center gap-2">
					{form.status === "draft" && (
						<Button
							variant="outline"
							size="sm"
							className="h-8 text-xs"
							onClick={() => handleSave(true)}
							disabled={updateMutation.isPending}
						>
							Save Draft
						</Button>
					)}
					<Button
						size="sm"
						className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
						onClick={() => handleSave(false)}
						disabled={updateMutation.isPending}
					>
						<Save className="w-3.5 h-3.5" /> Save Changes
					</Button>
				</div>
			}
		>
			<SampleOrderForm
				mode="edit"
				orderNumber={orderNumber}
				form={form}
				onChange={setForm}
				errors={errors}
				salesmen={salesmen}
				products={products}
				showStatus
				auditInfo={auditInfo ?? undefined}
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
