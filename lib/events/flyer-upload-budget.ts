export const MAX_PUBLIC_EVENT_FLYERS = 5
export const MAX_PUBLIC_EVENT_FLYER_BYTES = 50 * 1024 * 1024
const EXPIRED_RESERVATION_CLEANUP_LIMIT = 100

export interface FlyerUploadReservation {
  id: string
  eventId: string
  tokenId: string
  fileSize: number
  expiresAt: number
}

/**
 * Reserves anonymous event-flyer capacity before an R2 write. D1 executes the
 * cleanup and conditional insert as one transaction, so concurrent requests
 * cannot all pass a stale count/byte check.
 */
export async function reservePublicEventFlyerUpload(
  db: D1Database,
  reservation: FlyerUploadReservation,
  now = Date.now()
): Promise<boolean> {
  const results = await db.batch([
    db.prepare(
      `DELETE FROM event_flyer_upload_reservations
       WHERE id IN (
         SELECT id
         FROM event_flyer_upload_reservations
         WHERE state = 'reserved' AND expires_at < ?
         ORDER BY expires_at
         LIMIT ?
       )`
    ).bind(now, EXPIRED_RESERVATION_CLEANUP_LIMIT),
    db.prepare(
      `INSERT INTO event_flyer_upload_reservations (
         id, event_id, token_id, file_size, state, expires_at, updated_at
       )
       SELECT ?, ?, ?, ?, 'reserved', ?, datetime('now')
       WHERE
         (
           (SELECT COUNT(*) FROM event_flyers WHERE event_id = ?)
           +
           (SELECT COUNT(*)
            FROM event_flyer_upload_reservations
            WHERE event_id = ? AND state = 'reserved' AND expires_at >= ?)
         ) < ?
         AND
         (
           (SELECT COALESCE(SUM(file_size), 0) FROM event_flyers WHERE event_id = ?)
           +
           (SELECT COALESCE(SUM(file_size), 0)
            FROM event_flyer_upload_reservations
            WHERE event_id = ? AND state = 'reserved' AND expires_at >= ?)
           + ?
         ) <= ?
         AND
         (
           SELECT COUNT(*)
           FROM event_flyer_upload_reservations
           WHERE token_id = ?
             AND (state = 'committed' OR (state = 'reserved' AND expires_at >= ?))
         ) < ?`
    ).bind(
      reservation.id,
      reservation.eventId,
      reservation.tokenId,
      reservation.fileSize,
      reservation.expiresAt,
      reservation.eventId,
      reservation.eventId,
      now,
      MAX_PUBLIC_EVENT_FLYERS,
      reservation.eventId,
      reservation.eventId,
      now,
      reservation.fileSize,
      MAX_PUBLIC_EVENT_FLYER_BYTES,
      reservation.tokenId,
      now,
      MAX_PUBLIC_EVENT_FLYERS
    ),
  ])

  return (results[1]?.meta.changes ?? 0) === 1
}

export async function releasePublicEventFlyerReservation(
  db: D1Database,
  reservationId: string
): Promise<void> {
  await db.prepare(
    `DELETE FROM event_flyer_upload_reservations
     WHERE id = ? AND state = 'reserved'`
  )
    .bind(reservationId)
    .run()
}
