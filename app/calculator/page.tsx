'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateROI, ROIInput, ROIResult } from '@/lib/calculations'
import BreakevenChart from '@/components/BreakevenChart'
import PageWrapper from '@/components/PageWrapper'

export default function CalculatorPage() {
  const [input, setInput] = useState<ROIInput>({
    numberOfPanels: 10,
    costPerPanel: 12000,
    dailySunlightHours: 5,
    electricityRate: 8,
    panelWattage: 400,
  })

  const [result, setResult] = useState<ROIResult | null>(null)

  return (
    <PageWrapper>
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">ROI Calculator</h1>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Panel Configuration</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label>Number of Panels</Label>
              <Input
                type="number"
                value={input.numberOfPanels}
                onChange={(e) => setInput({ ...input, numberOfPanels: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Cost Per Panel (₹)</Label>
              <Input
                type="number"
                value={input.costPerPanel}
                onChange={(e) => setInput({ ...input, costPerPanel: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Panel Wattage (W)</Label>
              <Input
                type="number"
                value={input.panelWattage}
                onChange={(e) => setInput({ ...input, panelWattage: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Daily Sunlight Hours</Label>
              <Input
                type="number"
                value={input.dailySunlightHours}
                onChange={(e) => setInput({ ...input, dailySunlightHours: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Electricity Rate (₹/kWh)</Label>
              <Input
                type="number"
                value={input.electricityRate}
                onChange={(e) => setInput({ ...input, electricityRate: Number(e.target.value) })}
              />
            </div>
            <Button onClick={() => setResult(calculateROI(input))}>
              Calculate ROI
            </Button>
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Total Investment</span>
                <span className="font-bold text-red-500">₹{result.totalInvestment.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Daily Generation</span>
                <span className="font-semibold">{result.dailyGeneration} kWh</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Daily Savings</span>
                <span className="font-semibold text-green-600">₹{result.dailySavings}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Monthly Savings</span>
                <span className="font-semibold text-green-600">₹{result.monthlySavings}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Yearly Savings</span>
                <span className="font-semibold text-green-600">₹{result.yearlySavings}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-muted-foreground">Breakeven</span>
                <span className="font-bold text-xl">
                  {result.breakEvenYears} years
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Enter your panel details and click Calculate
            </p>
          </Card>
        )}
      </div>
      <BreakevenChart
        numberOfPanels={input.numberOfPanels}
        dailySunlightHours={input.dailySunlightHours}
        electricityRate={input.electricityRate}
      />
    </div>
    </PageWrapper>
  )
}