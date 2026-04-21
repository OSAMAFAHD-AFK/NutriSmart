import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function OrganizationManagementPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-4 rounded-2xl bg-primary/10 p-4 text-primary">
              <Building2 size={34} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Organization Management System
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Organization Management System - Coming Soon
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
