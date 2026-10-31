import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SealDefs,
  SealFrame,
  SealLettering,
  SealRim,
  Sunburst,
} from './SealParts';
import { tierLabel } from './tierLabel';
import { metalFor } from './tierMetal';

// A struck metal coin: bevelled rim, spun face, engraved capitals
export function TierSeal({ name }: { name: string }) {
  const { t } = useTranslation();
  const id = useId().replace(/:/g, '');
  const metal = metalFor(name);
  const label = tierLabel(t, name);

  return (
    <SealFrame label={label}>
      <defs>
        <SealDefs id={id} metal={metal} />
      </defs>
      <g filter={`url(#${id}-lift)`}>
        <SealRim id={id} />
      </g>
      <Sunburst id={id} metal={metal} />
      <SealLettering metal={metal} label={label} />
    </SealFrame>
  );
}
