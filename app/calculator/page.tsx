'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {calculateROI , ROIInput, ROIResult} from "@/lib/calculations";
import {useState} from "react";
export default function CalculatorPage() {
    const [input, setInput] = useState<ROIInput>({
  numberOfPanels: 0,
  costPerPanel: 0,
  dailySunlightHours: 0,
  electricityRate: 0,
  panelWattage: 0,
})
const [result, setResult] = useState<ROIResult | null>(null)
    return(
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 font-sans dark:bg-black">
            <div className="flex flex-col gap-1">
                <Label>Number of Panels</Label>
                <Input type="number" value={input.numberOfPanels} onChange={(e) => setInput({ ...input, numberOfPanels: Number(e.target.value) })}/>
            </div>
            <div className="flex flex-col gap-1">
  <Label>Cost Per Panel</Label>
  <Input
    type="number"
    value={input.costPerPanel}
    onChange={(e) => setInput({ ...input, costPerPanel: Number(e.target.value) })}
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
  <Label>Electricity Rate</Label>
  <Input
    type="number"
    value={input.electricityRate}
    onChange={(e) => setInput({ ...input, electricityRate: Number(e.target.value) })}
  />
</div>
<div className="flex flex-col gap-1">
  <Label>Panel Wattage</Label>
  <Input
    type="number"
    value={input.panelWattage}
    onChange={(e) => setInput({ ...input, panelWattage: Number(e.target.value) })}
  />
</div>
<Button onClick={() => setResult(calculateROI(input))}>
  Calculate
</Button>
{result && (
  <Card className="mt-6 w-96">
    <CardHeader>
      <CardTitle>ROI Results</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-2">
      {/* show these six values */}
      <p><strong>Total Investment:</strong> ${result.totalInvestment.toFixed(2)}</p>
      <p><strong>Daily Savings:</strong> ${result.dailySavings.toFixed(2)}</p>
      <p><strong>Monthly Savings:</strong> ${result.monthlySavings.toFixed(2)}</p>
      <p><strong>Yearly Savings:</strong> ${result.yearlySavings.toFixed(2)}</p>
      <p><strong>Break-Even Months:</strong> {result.breakEvenMonths}</p>
      <p><strong>Break-Even Years:</strong> {result.breakEvenYears}</p>
    </CardContent>
  </Card>
)}  
        </div>

    )
}