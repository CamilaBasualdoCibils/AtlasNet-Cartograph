import { IconMap2 } from '@tabler/icons-react';

export function Brand() {
  return (
    <span className="d-inline-flex align-items-center gap-2 fw-bold">
      <span className="brand-icon bg-primary text-white">
        <IconMap2 size={20} aria-hidden="true" />
      </span>
      Cartograph
    </span>
  );
}
