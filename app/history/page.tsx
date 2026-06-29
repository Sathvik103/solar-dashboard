import {Table, TableBody, TableCell, TableHeader, TableRow , TableHead} from "@/components/ui/table";
import { generateHistoryData } from "@/lib/solarData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageWrapper from "@/components/PageWrapper";

export default function HistoryPage() {
  const historyData = generateHistoryData();
  return (
    <PageWrapper>
    <div className="p-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Units Generated (kWh)</TableHead>
                <TableHead>Money Saved (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyData.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{entry.unitsGenerated}</TableCell>
                  <TableCell>₹{entry.moneySaved}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </PageWrapper>
  )
}





