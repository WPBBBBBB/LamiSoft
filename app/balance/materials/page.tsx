"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { PermissionGuard } from "@/components/permission-guard"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Wallet, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface MaterialBalance {
  productCode: string
  productName: string
  availableQuantity: number
  soldQuantity: number
  purchasePriceIQD: number
  sellPriceIQD: number
  profitPerUnit: number
}

export default function MaterialsBalancePage() {
  const { currentLanguage } = useSettings()
  const [materials, setMaterials] = useState<MaterialBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    loadMaterialsData()
  }, [])

  const loadMaterialsData = async () => {
    try {
      setIsLoading(true)

      const { data: inventoryData, error: inventoryError } = await supabase
        .from("tb_inventory")
        .select("productcode, productname, quantity")

      if (inventoryError) throw inventoryError

      const { data: salesData, error: salesError } = await supabase
        .from("tb_salesdetails")
        .select("productcode, quantity")

      if (salesError) throw salesError

      const { data: purchaseData, error: purchaseError } = await supabase
        .from("tb_purchaseproductsdetails")
        .select("productcode1, purchasesinglepriceiqd, sellsinglepriceiqd")
        .order("addeddate", { ascending: false })

      if (purchaseError) throw purchaseError

      const materialsMap = new Map<string, MaterialBalance>()

      inventoryData?.forEach((item) => {
        materialsMap.set(item.productcode, {
          productCode: item.productcode,
          productName: item.productname,
          availableQuantity: Number(item.quantity) || 0,
          soldQuantity: 0,
          purchasePriceIQD: 0,
          sellPriceIQD: 0,
          profitPerUnit: 0,
        })
      })

      const salesMap = new Map<string, number>()
      salesData?.forEach((sale) => {
        const currentQty = salesMap.get(sale.productcode) || 0
        salesMap.set(sale.productcode, currentQty + Number(sale.quantity))
      })

      salesMap.forEach((qty, productCode) => {
        const material = materialsMap.get(productCode)
        if (material) {
          material.soldQuantity = qty
        }
      })

      const pricesMap = new Map<string, { purchase: number; sell: number }>()
      purchaseData?.forEach((purchase) => {
        if (!pricesMap.has(purchase.productcode1)) {
          pricesMap.set(purchase.productcode1, {
            purchase: Number(purchase.purchasesinglepriceiqd) || 0,
            sell: Number(purchase.sellsinglepriceiqd) || 0,
          })
        }
      })

      pricesMap.forEach((prices, productCode) => {
        const material = materialsMap.get(productCode)
        if (material) {
          material.purchasePriceIQD = prices.purchase
          material.sellPriceIQD = prices.sell
          material.profitPerUnit = prices.sell - prices.purchase
        }
      })

      const materialsArray = Array.from(materialsMap.values())
      setMaterials(materialsArray)
      toast.success(t('dataLoadedSuccess', currentLanguage.code))
    } catch (error) {
      toast.error(t('errorLoadingData', currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value)
  }

  const totalPages = Math.ceil(materials.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMaterials = materials.slice(startIndex, endIndex)

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [materials.length])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <Wallet className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t('loadingData', currentLanguage.code)}</p>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard requiredPermission="view_statistics">
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
            {t('materialsBalance', currentLanguage.code)}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('viewInventoryAndProfits', currentLanguage.code)}
          </p>
        </div>
        <Button onClick={loadMaterialsData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('refresh', currentLanguage.code)}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t('materialsBalanceTable', currentLanguage.code)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>{t('materialCode', currentLanguage.code)}</TableHead>
                  <TableHead>{t('materialName', currentLanguage.code)}</TableHead>
                  <TableHead>{t('availableQuantity', currentLanguage.code)}</TableHead>
                  <TableHead>{t('soldQuantity', currentLanguage.code)}</TableHead>
                  <TableHead>{t('singlePurchasePrice', currentLanguage.code)}</TableHead>
                  <TableHead>{t('singleSalePrice', currentLanguage.code)}</TableHead>
                  <TableHead>{t('singleProfit', currentLanguage.code)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('noMaterialsToDisplay', currentLanguage.code)}
                    </TableCell>
                  </TableRow>
                ) : (
                  currentMaterials.map((material, index) => (
                    <TableRow key={material.productCode}>
                      <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-medium">{material.productCode}</TableCell>
                      <TableCell>{material.productName}</TableCell>
                      <TableCell className="font-semibold text-blue-600">
                        {formatCurrency(material.availableQuantity)}
                      </TableCell>
                      <TableCell className="font-semibold text-purple-600">
                        {formatCurrency(material.soldQuantity)}
                      </TableCell>
                      <TableCell>{formatCurrency(material.purchasePriceIQD)} د.ع</TableCell>
                      <TableCell>{formatCurrency(material.sellPriceIQD)} د.ع</TableCell>
                      <TableCell className={material.profitPerUnit >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        {formatCurrency(material.profitPerUnit)} د.ع
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {t('showing', currentLanguage.code)} {startIndex + 1} - {Math.min(endIndex, materials.length)} {t('of', currentLanguage.code)} {materials.length} {t('material', currentLanguage.code)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronRight className="h-4 w-4" />
                  {t('previous', currentLanguage.code)}
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{t('page', currentLanguage.code)} {currentPage} {t('of', currentLanguage.code)} {totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  {t('next', currentLanguage.code)}
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {}
          <div className="mt-6 space-y-2 border-t pt-4">
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">{t('totalMaterialsCount', currentLanguage.code)}:</span>
              <span className="text-blue-600 font-bold">{formatCurrency(materials.length)} {t('material', currentLanguage.code)}</span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">{t('totalAvailableQuantity', currentLanguage.code)}:</span>
              <span className="text-green-600 font-bold">
                {formatCurrency(materials.reduce((sum, m) => sum + m.availableQuantity, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">{t('totalSoldQuantity', currentLanguage.code)}:</span>
              <span className="text-purple-600 font-bold">
                {formatCurrency(materials.reduce((sum, m) => sum + m.soldQuantity, 0))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </PermissionGuard>
  )
}
