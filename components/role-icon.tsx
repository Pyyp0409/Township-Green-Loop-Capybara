import Image from "next/image";

const ROLE_ICON: Record<string, { src: string; label: string }> = {
  resident: { src: "/roles/resident.png", label: "Resident" },
  supporter: { src: "/roles/supporter.jpg", label: "Supporter" },
  merchant: { src: "/roles/shop.png", label: "Mall shop" },
  developer_admin: { src: "/roles/admin.png", label: "Township admin" },
};

/**
 * A supporter has the resident role but funds the township from elsewhere, so
 * membership decides the icon before role does.
 */
function iconKey(role: string | null | undefined, membership?: string | null) {
  if (membership === "supporter") return "supporter";
  return role ?? "resident";
}

/** The hand-drawn badge that says which side of the township someone is on. */
export function RoleIcon({
  role,
  membership,
  size = 36,
  className = "",
}: {
  role: string | null | undefined;
  membership?: string | null;
  size?: number;
  className?: string;
}) {
  const icon = ROLE_ICON[iconKey(role, membership)] ?? ROLE_ICON.resident;
  return (
    <Image
      src={icon.src}
      alt={icon.label}
      title={icon.label}
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${className}`}
    />
  );
}

export function roleLabel(
  role: string | null | undefined,
  membership?: string | null,
): string {
  return ROLE_ICON[iconKey(role, membership)]?.label ?? "Member";
}
