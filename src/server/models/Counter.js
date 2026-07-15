/**
 * Atomic sequence generator — used for human-readable order numbers.
 * findOneAndUpdate($inc) is atomic, so two concurrent checkouts can never be
 * handed the same order id (which `Math.random()` could).
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const CounterSchema = new Schema({
  _id: { type: String, required: true }, // e.g. "order"
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

export async function nextSequence(name) {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.seq;
}

export default Counter;
