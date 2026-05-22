/**
 * Travel time (minutes):
 * - Same floor: 1 minute per adjacent room => |posA - posB|
 * - Different floors: 2 minutes per floor; lift/stairs on the left, so travel is
 *   posA + posB + 2 * |floorA - floorB|
 */

function distanceMinutes(a, b) {
  const df = Math.abs(a.floor_number - b.floor_number);
  if (df === 0) {
    return Math.abs(a.position_index - b.position_index);
  }
  return a.position_index + b.position_index + 2 * df;
}

/** Diameter of a set: max pairwise travel time. */
function diameterMinutes(subset) {
  if (subset.length <= 1) return 0;
  let maxD = 0;
  for (let i = 0; i < subset.length; i++) {
    for (let j = i + 1; j < subset.length; j++) {
      const d = distanceMinutes(subset[i], subset[j]);
      if (d > maxD) maxD = d;
    }
  }
  return maxD;
}

/** Minimum horizontal span for choosing k rooms on one floor (sorted positions). */
function bestSameFloorSpan(sortedPositions, k) {
  if (sortedPositions.length < k) return null;
  let best = Infinity;
  for (let i = 0; i + k <= sortedPositions.length; i++) {
    const span = sortedPositions[i + k - 1] - sortedPositions[i];
    if (span < best) best = span;
  }
  return best;
}

function bestSameFloorSubset(roomsOnFloor, k) {
  const sorted = [...roomsOnFloor].sort(
    (a, b) => a.position_index - b.position_index
  );
  const positions = sorted.map((r) => r.position_index);
  let bestSpan = Infinity;
  let bestStart = 0;
  for (let i = 0; i + k <= sorted.length; i++) {
    const span = positions[i + k - 1] - positions[i];
    if (span < bestSpan) {
      bestSpan = span;
      bestStart = i;
    }
  }
  return sorted.slice(bestStart, bestStart + k);
}

function* combinationsIndices(n, k) {
  const idx = Array.from({ length: k }, (_, i) => i);
  if (k > n) return;
  if (k === 0) {
    yield [];
    return;
  }
  while (true) {
    yield [...idx];
    let t = k - 1;
    while (t >= 0 && idx[t] === n - k + t) t--;
    if (t < 0) return;
    idx[t]++;
    for (let j = t + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}

function lexKey(rooms) {
  return rooms
    .map((r) => r.room_number)
    .sort((a, b) => a - b)
    .join(',');
}

/** Greedy min-diameter when exact search is too expensive. */
function greedyMinDiameterSubset(available, n) {
  const sorted = [...available].sort((a, b) => a.room_number - b.room_number);
  let bestSubset = null;
  let bestD = Infinity;
  let bestLex = '';

  for (let s = 0; s < sorted.length; s++) {
    const subset = [sorted[s]];
    const used = new Set([sorted[s].id ?? sorted[s].room_number]);
    while (subset.length < n) {
      let bestAdd = null;
      /** @type {[number, string, number] | null} */
      let bestTuple = null;
      for (const r of sorted) {
        const key = r.id ?? r.room_number;
        if (used.has(key)) continue;
        const next = [...subset, r];
        const d = diameterMinutes(next);
        const lk = lexKey(next);
        const tuple = [d, lk, r.room_number];
        if (
          !bestTuple ||
          tuple[0] < bestTuple[0] ||
          (tuple[0] === bestTuple[0] &&
            (tuple[1] < bestTuple[1] ||
              (tuple[1] === bestTuple[1] && tuple[2] < bestTuple[2])))
        ) {
          bestTuple = tuple;
          bestAdd = r;
        }
      }
      if (!bestAdd) break;
      subset.push(bestAdd);
      used.add(bestAdd.id ?? bestAdd.room_number);
    }
    if (subset.length < n) continue;
    const d = diameterMinutes(subset);
    const lk = lexKey(subset);
    if (d < bestD || (d === bestD && lk < bestLex)) {
      bestD = d;
      bestSubset = subset;
      bestLex = lk;
    }
  }

  if (!bestSubset) {
    throw new Error('Greedy selection failed.');
  }
  bestSubset.sort((a, b) => a.room_number - b.room_number);
  return bestSubset;
}

/**
 * Pick n rooms from `available`.
 * Same floor: minimize horizontal span (tie: lower floor).
 * Else: minimize diameter under distanceMinutes (exact if pool small; greedy otherwise).
 */
function selectRoomsForBooking(available, n) {
  if (n < 1 || n > 5) {
    throw new Error('You can book between 1 and 5 rooms.');
  }
  if (available.length < n) {
    throw new Error(`Only ${available.length} room(s) available for booking.`);
  }

  const byFloor = new Map();
  for (const r of available) {
    const f = r.floor_number;
    if (!byFloor.has(f)) byFloor.set(f, []);
    byFloor.get(f).push(r);
  }

  let bestSameFloor = null;
  let bestSameFloorSpanVal = Infinity;
  let bestSameFloorFloor = Infinity;

  for (let floor = 1; floor <= 10; floor++) {
    const list = byFloor.get(floor);
    if (!list || list.length < n) continue;
    const positions = list
      .map((r) => r.position_index)
      .sort((a, b) => a - b);
    const span = bestSameFloorSpan(positions, n);
    if (span === null) continue;
    if (
      span < bestSameFloorSpanVal ||
      (span === bestSameFloorSpanVal && floor < bestSameFloorFloor)
    ) {
      bestSameFloorSpanVal = span;
      bestSameFloorFloor = floor;
      bestSameFloor = bestSameFloorSubset(list, n);
    }
  }

  if (bestSameFloor) {
    bestSameFloor.sort((a, b) => a.room_number - b.room_number);
    return {
      rooms: bestSameFloor,
      strategy: 'same_floor',
      travelMinutes: bestSameFloorSpanVal,
      diameterMinutes: bestSameFloorSpanVal,
    };
  }

  const arr = available.slice();
  arr.sort((a, b) => a.room_number - b.room_number);

  const MAX_EXACT_POOL = 26;

  if (arr.length <= MAX_EXACT_POOL) {
    let bestSubset = null;
    let bestDiameter = Infinity;
    let bestLex = '';

    for (const comb of combinationsIndices(arr.length, n)) {
      const subset = comb.map((i) => arr[i]);
      const diam = diameterMinutes(subset);
      const lk = lexKey(subset);
      if (diam < bestDiameter || (diam === bestDiameter && lk < bestLex)) {
        bestDiameter = diam;
        bestSubset = subset;
        bestLex = lk;
      }
    }

    bestSubset.sort((a, b) => a.room_number - b.room_number);
    return {
      rooms: bestSubset,
      strategy: 'multi_floor',
      travelMinutes: bestDiameter,
      diameterMinutes: bestDiameter,
    };
  }

  const greedyPick = greedyMinDiameterSubset(arr, n);
  const diam = diameterMinutes(greedyPick);
  return {
    rooms: greedyPick,
    strategy: 'multi_floor_greedy',
    travelMinutes: diam,
    diameterMinutes: diam,
  };
}

module.exports = {
  distanceMinutes,
  diameterMinutes,
  selectRoomsForBooking,
};
