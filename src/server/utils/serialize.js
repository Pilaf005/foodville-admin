/**
 * Serializers: convert lean Mongoose documents into the exact client shape the
 * finalized UI expects. We query with `.lean()` for speed (no hydration), so
 * virtuals don't run — these helpers re-add `id` and strip internal fields.
 */

const stripInternal = ({ _id, __v, isActive, createdAt, updatedAt, ...rest }) => rest;

export function serializeProduct(doc) {
  if (!doc) return null;
  const { numericId, ...rest } = stripInternal(doc);
  // `id` MUST come after the spread: hydrated docs (from .toObject()) carry a
  // Mongoose `id` virtual, and spreading it last would clobber the numeric id
  // the whole UI keys off. Ordering it this way makes both lean and hydrated
  // documents serialize identically.
  const out = { ...rest, id: numericId };
  // comboIncludes is only meaningful for combos; drop when empty/undefined.
  if (!out.comboIncludes || out.comboIncludes.length === 0) delete out.comboIncludes;
  return out;
}

export const serializeProducts = (docs = []) => docs.map(serializeProduct);

export function serializeCategory(doc) {
  if (!doc) return null;
  const { slug, name, image, bgColor, order } = doc;
  return { id: slug, name, ...(image ? { image } : {}), ...(bgColor ? { bgColor } : {}), ...(order != null ? { order } : {}) };
}

export const serializeCategories = (docs = []) => docs.map(serializeCategory);

export function serializeBlog(doc) {
  if (!doc) return null;
  const { numericId, ...rest } = stripInternal(doc);
  return { ...rest, id: numericId }; // see note in serializeProduct
}

export const serializeBlogs = (docs = []) => docs.map(serializeBlog);
