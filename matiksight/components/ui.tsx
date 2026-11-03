import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-header-action">{action}</div>}</div>;
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function PanelHeading({ title, subtitle, action }: { title: React.ReactNode; subtitle?: string; action?: React.ReactNode }) {
  return <div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <div className="panel-heading-action">{action}</div>}</div>;
}

export function StatusBadge({ children }: { children: string }) {
  const className = children === "Selesai" ? "success" : children === "Gagal" ? "danger" : "warning";
  return <span className={`status-badge ${className}`}><i />{children}</span>;
}

export type SelectOption = string | { value: string; label: string };

export function SelectField({ value, options, onChange, label }: { value: string; options: SelectOption[]; onChange: (value: string) => void; label?: string }) {
  return <label className="select-wrap">{label && <span className="sr-only">{label}</span>}<select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => {
    const optionValue = typeof option === "string" ? option : option.value;
    const optionLabel = typeof option === "string" ? option : option.label;
    return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
  })}</select><ChevronDown size={14} /></label>;
}

export function Trend({ value, positive = true }: { value: string; positive?: boolean }) {
  const Icon = positive ? ArrowUp : ArrowDown;
  return <span className={`trend ${positive ? "positive" : "negative"}`}><Icon size={13} />{value}</span>;
}
