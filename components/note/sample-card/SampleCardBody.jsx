import { SampleCardHeader } from './SampleCardHeader';
import { SampleCardMeta } from './SampleCardMeta';
import { SampleCardTags } from './SampleCardTags';
import { SampleCardActions } from './SampleCardActions';

export function SampleCardBody({
  model,
  rating,
  batchMode,
  compareMode,
  onRatingChange,
  onEdit,
  onCopy,
  onNextRound,
  onDelete,
  canEdit = false,
}) {
  const { rec, title, names, testDate, roundLabel, isChained, company, price, description, tags } =
    model;

  return (
    <div style={{ padding: '12px 14px 14px' }}>
      <SampleCardHeader
        title={title}
        sampleId={rec.id}
        rating={rating}
        onRatingChange={onRatingChange}
        canEdit={canEdit}
      />
      <SampleCardMeta
        names={names}
        testDate={testDate}
        roundLabel={roundLabel}
        isChained={isChained}
        company={company}
        price={price}
        priceTaxType={rec.priceTaxType}
      />
      {description && <SampleCardDescription description={description} />}
      <SampleCardTags tags={tags} />
      {!batchMode && !compareMode && (
        <SampleCardActions
          onEdit={onEdit}
          onCopy={onCopy}
          onNextRound={onNextRound}
          onDelete={onDelete}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

function SampleCardDescription({ description }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: 'var(--text-3)',
        lineHeight: 1.6,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      {description}
    </div>
  );
}
