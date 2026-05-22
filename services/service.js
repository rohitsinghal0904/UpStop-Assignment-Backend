const { getPool } = require('../db');
const {
  selectRoomsForBooking,
  distanceMinutes,
} = require('../bookingEngine');

/**
 * Fetch all rooms
 */
async function fetchAllRooms() {
  const pool = await getPool();

  const [rows] = await pool.query(`
    SELECT
      id,
      room_number,
      floor_number,
      position_index,
      is_random_occupied AS randomOccupied,
      is_booked AS booked
    FROM rooms
    ORDER BY room_number ASC
  `);

  return rows;
}

/**
 * Health
 */
exports.health = async () => {
  const pool = await getPool();

  await pool.query('SELECT 1');

  return {
    ok: true,
  };
};

/**
 * Get Rooms
 */
exports.getRooms = async () => {
  return await fetchAllRooms();
};

/**
 * Book Rooms
 */
exports.bookRooms = async (body) => {
  const n = Number(
    body?.count ??
    body?.rooms
  );

  if (
    !Number.isInteger(n) ||
    n < 1 ||
    n > 5
  ) {
    throw new Error(
      'count must be an integer from 1 to 5.'
    );
  }

  const pool = await getPool();
  const conn =
    await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] =
      await conn.query(
        `
        SELECT
          id,
          room_number,
          floor_number,
          position_index
        FROM rooms
        WHERE
          is_random_occupied = 0
          AND is_booked = 0
        FOR UPDATE
      `
      );

    const selection =
      selectRoomsForBooking(
        rows,
        n
      );

    const ids =
      selection.rooms.map(
        (r) => r.id
      );

    if (ids.length) {
      await conn.query(
        `
        UPDATE rooms
        SET is_booked = 1
        WHERE id IN (?)
      `,
        [ids]
      );
    }

    await conn.commit();

    return {
      ok: true,
      strategy:
        selection.strategy,
      travelMinutes:
        selection.travelMinutes,
      diameterMinutes:
        selection.diameterMinutes,
      booked:
        selection.rooms,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Random Occupancy
 */
exports.randomOccupancy =
  async (body) => {
    const pool =
      await getPool();

    const p = Number(
      body?.probability ??
      0.35
    );

    const prob =
      Math.min(
        0.95,
        Math.max(0.05, p)
      );

    await pool.query(
      `
      UPDATE rooms
      SET is_random_occupied =
      CASE
        WHEN is_booked = 1
          THEN is_random_occupied
        WHEN RAND() < ?
          THEN 1
        ELSE 0
      END
    `,
      [prob]
    );

    return await fetchAllRooms();
  };

/**
 * Reset Rooms
 */
exports.resetRooms =
  async (body) => {
    const pool =
      await getPool();

    const clearRandom =
      Boolean(
        body?.clearRandom
      );

    if (clearRandom) {
      await pool.query(`
        UPDATE rooms
        SET
          is_booked = 0,
          is_random_occupied = 0
      `);
    } else {
      await pool.query(`
        UPDATE rooms
        SET is_booked = 0
      `);
    }

    return await fetchAllRooms();
  };

/**
 * Travel Matrix
 */
exports.travelMatrix =
  async (body) => {
    const pool =
      await getPool();

    const roomNumbers =
      body?.roomNumbers;

    if (
      !Array.isArray(
        roomNumbers
      ) ||
      roomNumbers.length < 2
    ) {
      throw new Error(
        'roomNumbers array required.'
      );
    }

    const [rows] =
      await pool.query(
        `
        SELECT
          room_number,
          floor_number,
          position_index
        FROM rooms
        WHERE room_number IN (?)
      `,
        [roomNumbers]
      );

    const byNum =
      new Map(
        rows.map((r) => [
          r.room_number,
          r,
        ])
      );

    const list =
      roomNumbers
        .map((n) =>
          byNum.get(n)
        )
        .filter(Boolean);

    const matrix = [];

    for (
      let i = 0;
      i < list.length;
      i++
    ) {
      matrix[i] = [];

      for (
        let j = 0;
        j < list.length;
        j++
      ) {
        matrix[i][j] =
          i === j
            ? 0
            : distanceMinutes(
              list[i],
              list[j]
            );
      }
    }

    return {
      rooms: list,
      matrix,
    };
  };