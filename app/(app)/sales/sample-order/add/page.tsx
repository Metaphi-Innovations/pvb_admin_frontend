"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle2, XCircle } from "lucide-react";
import type { Employee } from "@/app/(app)/user-management/employee/employee-data";
import SalesOrderForm, {
	type SalesOrderFormValues,
	validateSalesOrderForm,
} from "../components/SalesOrderForm";
import {
	type ProductCatalogItem,
	buildOrderFromForm,
	createEmptyLineItem,
	generateOrderNumber,
	loadOrders,
	saveOrders,
	todayStr,
	getSalesmenForOrders,
	loadProductCatalog,
} from "../orders-data";

export default function AddSalesOrderPage() {
	const router = useRouter();
	const [salesmen, setSalesmen] = useState<Employee[]>([]);
	const [products, setProducts] = useState<ProductCatalogItem[]>([]);
	const [orderNumber, setOrderNumber] = useState("SM-2024-011");
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

	useEffect(() => {
		setSalesmen(getSalesmenForOrders());
		setProducts(loadProductCatalog());
		const orders = loadOrders();
		setOrderNumber(generateOrderNumber(orders));
	}, []);

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

		const newOrder = buildOrderFromForm(form, { soNumber: orderNumber }, asDraft);
		if (!newOrder) {
			setToast({ msg: "Invalid salesperson or warehouse selection.", type: "error" });
			return;
		}

		const orders = loadOrders();
		saveOrders([...orders, newOrder]);
		setToast({
			msg: asDraft
				? "Sample Order saved as draft."
				: newOrder.requiresApproval
					? "Sample Order submitted for approval."
					: "Sample Order created successfully.",
			type: "success",
		});
		setTimeout(() => router.push("/sales/sample-order"), 1000);
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
					>
						Save Draft
					</Button>
					<Button
						size="sm"
						className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
						onClick={() => handleSave(false)}
					>
						<Save className="w-3.5 h-3.5" /> Submit Order
					</Button>
				</div>
			}
		>
			<SalesOrderForm
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
