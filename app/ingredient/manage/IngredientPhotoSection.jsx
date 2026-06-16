'use client';
/* eslint-disable @next/next/no-img-element */
import { Icon } from '@/components/icons';
import { INGREDIENT_PHOTO_SLOTS } from '@/lib/ingredient';
import { Field } from './IngredientFieldPrimitives';

export function PhotoSection({ formPhotos, photoInputRefs, onPhotoFile, onRemovePhoto }) {
  return (
    <Field label="사진" hint="포장·상세정보·실물 사진을 각각 1장씩 등록">
      <div className="ingredient-photo-slot-grid">
        {INGREDIENT_PHOTO_SLOTS.map(slot => {
          const photo = formPhotos[slot.key];
          const inputRef = photoInputRefs[slot.key];
          return (
            <div key={slot.key} className="ingredient-photo-slot">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={e => {
                  onPhotoFile(slot.key, e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                className="ingredient-photo-preview"
                onClick={() => inputRef.current?.click()}
                aria-label={`${slot.label} 선택`}
              >
                {photo?.data ? (
                  <img src={photo.data} alt={photo.name || slot.label} />
                ) : (
                  <Icon.plus style={{ width: 18, height: 18 }} />
                )}
              </button>
              <div className="ingredient-photo-slot-copy">
                <div>{slot.label}</div>
                <span>{slot.hint}</span>
              </div>
              <div className="ingredient-photo-slot-actions">
                <button type="button" className="btn xs" onClick={() => inputRef.current?.click()}>
                  선택
                </button>
                {photo?.data && (
                  <button
                    type="button"
                    className="btn xs ghost"
                    onClick={() => onRemovePhoto(slot.key)}
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Field>
  );
}
