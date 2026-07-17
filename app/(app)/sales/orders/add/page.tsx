"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle2, XCircle } from "lucide-react";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import type { Employee } from "@/app/(app)/user-management/employee/employee-data";
import SalesOrderForm, {
	type SalesOrderFormValues,
	validateSalesOrderForm,
} from "../components/SalesOrderForm";
import { syncSchemeUtilizationFromOrder } from "@/app/(app)/masters/scheme/scheme-utilization-data";
import {
	type ProductCatalogItem,
	buildOrderFromForm,
	todayStr,
	getCustomersForTransactionDropdown,
	getSalesmenForOrders,
	loadProductCatalog,
	setDynamicProducts,
} from "../orders-data";
import { setDynamicPricingRecords } from "@/app/(app)/masters/pricing/pricing-data";
import { validateSalesOrderCreditLimit } from "@/lib/sales/sales-order-credit";
import type { CustomerCreditSummary } from "@/lib/sales/customer-credit-limit";
import CreditLimitExceededDialog from "../components/CreditLimitExceededDialog";
import {
	useNextSoNumber,
	useCreateSalesOrder,
	useCustomersDropdown,
	useSalesmenDropdown,
	useProductsDropdown,
	useProductPricingDropdown,
} from "@/hooks/sales/use-sales-orders";

export default function AddSalesOrderPage() {
	const router = useRouter();
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [salesmen, setSalesmen] = useState<Employee[]>([]);
	const [products, setProducts] = useState<ProductCatalogItem[]>([]);
	const [toast, setToast] = useState<{
		msg: string;
		type: "success" | "error";
	} | null>(null);

	const [form, setForm] = useState<SalesOrderFormValues>({
		orderDate: todayStr(),
		customerId: null,
		salesManId: null,
		deliveryDate: "",
		status: "confirmed",
		lineItems: [],
		additionalExpenses: [],
		warehouseId: null,
		warehouseName: "",
		billToAddressId: "",
		shipToAddressId: "",
		remarks: "",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [creditDialog, setCreditDialog] = useState<CustomerCreditSummary | null>(
		null,
	);

	const { data: nextOrderNumber, isLoading: loadingOrderNumber } = useNextSoNumber();
	const createMutation = useCreateSalesOrder();

	const { data: customerData } = useCustomersDropdown();
	const { data: salesmanData } = useSalesmenDropdown();
	const { data: productData } = useProductsDropdown();
	const { data: pricingData } = useProductPricingDropdown();

	const orderNumber = nextOrderNumber || "SO-2026-0001";

	useEffect(() => {
		if (customerData) {
			const mapped = customerData.map((c: any) => ({
				id: c.customer_id,
				customerCode: c.customer_code,
				customerName: c.customer_name,
				customerType: c.customer_type?.customer_type_name || "",
				status: c.is_active ? "active" : "inactive",
				mobile: c.mobile_no || "",
				email: c.email || "",
				gstApplicable: c.gst_applicable,
				gstin: c.gstin_no || "",
				registeredLegalName: c.registered_legal_name || "",
				registeredAddress: c.registered_gst_address || "",
				pan: c.pan_no || "",
				paymentType: c.payment_type || "Credit",
				creditLimit: Number(c.credit_limit || 0),
				creditDays: Number(c.credit_days || 0),
				branches: [],
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
				stock: Number(p.pack_size || 1000), // fallback stock
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
		if (pricingData) {
			const mapped = pricingData.map((pr: any) => ({
				id: pr.id,
				productId: pr.product_id,
				state: pr.state_name,
				customerType: pr.customer_type?.customer_type_name || "",
				status: pr.is_active ? "active" : "inactive",
				dealerPrice: Number(pr.dealer_price || 0),
				costPrice: Number(pr.cost_price || 0),
			}));
			setDynamicPricingRecords(mapped as any);
		} else {
			setDynamicPricingRecords(null);
		}
	}, [pricingData]);

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

		const customer = customers.find((c) => c.id === form.customerId);
		const creditCheck = validateSalesOrderCreditLimit({ form, customer });
		if (creditCheck.exceeded && creditCheck.summary) {
			setCreditDialog(creditCheck.summary);
			return;
		}

		createMutation.mutate(
			{
				form,
				options: {
					soNumber: orderNumber,
					status: asDraft ? "draft" : form.status || "confirmed",
				},
			},
			{
				onSuccess: (newOrder) => {
					if (customer) {
						syncSchemeUtilizationFromOrder(newOrder, customer, { isDraft: asDraft });
					}
					setToast({
						msg: asDraft
							? "Sales order saved as draft."
							: newOrder.status === "pending_approval"
								? "Sales order submitted for approval."
								: "Sales order created successfully.",
						type: "success",
					});
					setTimeout(() => router.push("/sales/orders"), 1000);
				},
				onError: (err: any) => {
					setToast({
						msg: err?.message || "Failed to create sales order.",
						type: "error",
					});
				},
			}
		);
	};

	return (
		<FormContainer
			title='Add Sales Order'
			description='Sales → Orders → New Order'
			onBack={() => router.push("/sales/orders")}
			onCancel={() => router.push("/sales/orders")}
			cancelLabel='Discard'
			noCard={true}
			actions={
				<div className='flex items-center gap-2'>
					<Button
						size='sm'
						variant='outline'
						className='h-8 text-xs gap-1.5 border-border hover:bg-muted/40'
						onClick={() => handleSave(true)}
						disabled={createMutation.isPending || loadingOrderNumber}
					>
						Save as Draft
					</Button>
					<Button
						size='sm'
						className='h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white'
						onClick={() => handleSave(false)}
						disabled={createMutation.isPending || loadingOrderNumber}
					>
						<Save className='w-3.5 h-3.5' /> Submit Order
					</Button>
				</div>
			}
		>
			<SalesOrderForm
				mode='add'
				orderNumber={orderNumber}
				form={form}
				onChange={setForm}
				errors={errors}
				customers={customers}
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
						<CheckCircle2 className='w-4 h-4' />
					) : (
						<XCircle className='w-4 h-4' />
					)}
					{toast.msg}
				</div>
			)}

			{creditDialog && (
				<CreditLimitExceededDialog
					open
					onClose={() => setCreditDialog(null)}
					summary={creditDialog}
				/>
			)}
		</FormContainer>
	);
}
