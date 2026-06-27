"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, CheckCircle2, XCircle } from "lucide-react";
import SalesOrderForm, {
	type SalesOrderFormValues,
	validateSalesOrderForm,
} from "../../components/SalesOrderForm";
import {
	type ProductCatalogItem,
	buildOrderFromForm,
	canEditOrder,
	getOrderById,
	orderToFormValues,
	getCustomersForTransactionDropdown,
	getSalesmenForOrders,
	loadOrders,
	loadProductCatalog,
	saveOrders,
} from "../../orders-data";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import type { Employee } from "@/app/(app)/user-management/employee/employee-data";

export default function EditSalesOrderPage() {
	const params = useParams();
	const router = useRouter();
	const id = Number(params.id);

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
	const [existingOrder, setExistingOrder] =
		useState<ReturnType<typeof getOrderById>>(undefined);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [toast, setToast] = useState<{
		msg: string;
		type: "success" | "error";
	} | null>(null);

	useEffect(() => {
		setCustomers(getCustomersForTransactionDropdown());
		setSalesmen(getSalesmenForOrders());
		setProducts(loadProductCatalog());

		const order = getOrderById(id);
		if (!order) return;

		if (!canEditOrder(order)) {
			setToast({ msg: "This order cannot be edited.", type: "error" });
			setTimeout(() => router.push("/sales/sample-order"), 1200);
			return;
		}

		setExistingOrder(order);
		setOrderNumber(order.soNumber);
		setForm(orderToFormValues(order));
		setAuditInfo({
			createdBy: order.createdBy,
			createdDate: order.createdDate,
			updatedBy: order.updatedBy,
			updatedDate: order.updatedDate,
		});
	}, [id, router]);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3200);
		return () => clearTimeout(t);
	}, [toast]);

	const handleSave = (asDraft: boolean) => {
		if (!form || !existingOrder) return;

		const e = validateSalesOrderForm(form);
		setErrors(e);
		if (Object.keys(e).length > 0) {
			setToast({ msg: "Please fix the errors before saving.", type: "error" });
			return;
		}

		const updated = buildOrderFromForm(
			form,
			{
				id: existingOrder.id,
				soNumber: existingOrder.soNumber,
				createdBy: existingOrder.createdBy,
				createdDate: existingOrder.createdDate,
				parentOrderId: existingOrder.parentOrderId,
				parentOrderNumber: existingOrder.parentOrderNumber,
				splitFromOrderId: existingOrder.splitFromOrderId,
				splitFromOrderNumber: existingOrder.splitFromOrderNumber,
				referenceOrderNumber: existingOrder.referenceOrderNumber,
				packingListId: existingOrder.packingListId,
				warehouseId: existingOrder.warehouseId,
				warehouseName: existingOrder.warehouseName,
				packingListNumber: existingOrder.packingListNumber,
				packingStatus: existingOrder.packingStatus,
			},
			asDraft,
		);

		if (!updated) {
			setToast({
				msg: "Invalid customer or salesman selection.",
				type: "error",
			});
			return;
		}

		const orders = loadOrders();
		saveOrders(orders.map((o) => (o.id === updated.id ? updated : o)));

		setToast({
			msg: asDraft
				? "Sample Order saved as draft."
				: updated.requiresApproval
					? "Sample Order updated and submitted for approval."
					: "Sample Order updated successfully.",
			type: "success",
		});
		setTimeout(() => router.push("/sales/sample-order"), 1000);
	};

	if (!form) {
		return (
			<FormContainer
				title='Edit Sample Order'
				description='Sales → Orders → Edit Order'
				onBack={() => router.push("/sales/sample-order")}
				onCancel={() => router.push("/sales/sample-order")}
				cancelLabel='Discard'
				noCard={true}
			>
				<p className='text-sm text-muted-foreground p-4'>Loading order…</p>
			</FormContainer>
		);
	}

	return (
		<FormContainer
			title='Edit Sample Order'
			description='Sales → Orders → Edit Order'
			onBack={() => router.push("/sales/sample-order")}
			onCancel={() => router.push("/sales/sample-order")}
			cancelLabel='Discard'
			noCard={true}
			actions={
				<div className='flex items-center gap-2'>
					<Button
						size='sm'
						className='h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white'
						onClick={() => handleSave(false)}
					>
						<Save className='w-3.5 h-3.5' /> Save Changes
					</Button>
				</div>
			}
		>
			<SalesOrderForm
				mode='edit'
				orderNumber={orderNumber}
				form={form}
				onChange={setForm}
				errors={errors}
				customers={customers}
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
						<CheckCircle2 className='w-4 h-4' />
					) : (
						<XCircle className='w-4 h-4' />
					)}
					{toast.msg}
				</div>
			)}
		</FormContainer>
	);
}


