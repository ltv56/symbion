import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { faceRadius, SealEdge, SealEdgeDefs, SealGlint } from './SealEdge';
import { SealDefs, SealFrame, SealLettering, Sunburst } from './SealParts';
import { tierLabel } from './tierLabel';
import { metalFor, rimFor } from './tierMetal';

// A struck metal coin: bevelled rim, spun face, engraved capitals. The edge grows richer with the tier.
export function TierSeal({ name }: { name: string }) {
  const { t } = useTranslation();
  const id = useId().replace(/:/g, '');
  const metal = metalFor(name);
  const rim = rimFor(name);
  const label = tierLabel(t, name);

  return (
    <SealFrame label={label}>
      <defs>
        <SealDefs id={id} metal={metal} />
        <SealEdgeDefs id={id} metal={metal} rim={rim} />
      </defs>
      <g filter={`url(#${id}-lift)`}>
        <SealEdge id={id} metal={metal} rim={rim} />
      </g>
      <Sunburst id={id} metal={metal} radius={faceRadius(rim)} />
      {rim === 'scalloped' && <SealGlint id={id} />}
      <SealLettering metal={metal} label={label} />
    </SealFrame>
  );
}
