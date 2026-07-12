export interface BrandConfig {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  supportContact: string;
  isTemporary: boolean;
}

/**
 * Temporary, neutral product copy until the final brand name is supplied.
 * User-facing surfaces must import this object instead of defining a name.
 */
export const brand = {
  name: "Certification Prep",
  shortName: "Cert Prep",
  tagline: "Learn. Recall. Apply. Test. Pass.",
  description:
    "Adaptive certification preparation that turns learner evidence into the next best study action.",
  supportContact: "support contact pending",
  isTemporary: true,
} as const satisfies BrandConfig;

export const APP_NAME = brand.name;
