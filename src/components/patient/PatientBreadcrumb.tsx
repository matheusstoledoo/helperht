import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronRight } from "lucide-react";

interface PatientBreadcrumbProps {
  currentPage: string;
  intermediatePages?: { label: string; href: string }[];
}

export function PatientBreadcrumb({ currentPage, intermediatePages }: PatientBreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/pac/dashboard" className="text-muted-foreground hover:text-foreground">
              Página inicial
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight className="h-4 w-4" />
        </BreadcrumbSeparator>
        {intermediatePages?.map((page, index) => (
          <span key={page.href} className="contents">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={page.href} className="text-muted-foreground hover:text-foreground">
                  {page.label}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
          </span>
        ))}
        <BreadcrumbItem>
          <BreadcrumbPage className="font-semibold">{currentPage}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
