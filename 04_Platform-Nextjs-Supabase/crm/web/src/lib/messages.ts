// Fills a message template ({placeholders} from Sheet edition 3.0) with a job, its customer and the shop details.
type Any = Record<string, any>;
const dmy = (v?: string | null) => { if (!v) return '-'; const d = new Date(v); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; };
const amt = (p?: number | null) => ((p || 0) / 100).toLocaleString('en-IN');

export function fillTemplate(body: string, job: Any, customer: Any | null, shop: Any, serviceName = '') {
  const d: Any = job.details || {};
  const v: Any = {
    name: customer?.name || '-', service: serviceName || '-', bookingId: job.number,
    ttdRef: job.ext_ref, serviceDate: dmy(job.service_date), checkIn: dmy(job.service_date), checkOut: dmy(d.check_out), preferredDate: dmy(job.wanted_date),
    releaseDate: dmy(d.release_date), expectedDate: dmy(job.expected_date), refundDate: dmy(d.refund_date),
    slot: d.slot || d.departure, reportingPoint: d.reporting_point, room: d.room, persons: job.persons, devotees: d.people,
    ticketAmount: amt(job.govt_fee), total: amt(job.total), received: amt(job.paid), refundAmount: amt(job.refunded || d.refund_due),
    balance: amt(Math.max(0, (job.total || 0) - (job.paid || 0))), refundStatus: d.refund_status, refundMode: d.refund_mode, remarks: d.reason || d.remarks,
    route: d.from || d.to ? `${d.from || '?'} → ${d.to || '?'}` : null, operator: d.operator, vehicleNo: d.vehicle_no, travelClass: d.class,
    seatInfo: d.seat, ticketStatus: d.ticket_status, boardingPoint: d.boarding, nextRelease: d.next_release,
    shopName: shop.shopName, shopNameTe: shop.shopNameTe, groupName: shop.groupName, groupNameTe: shop.groupNameTe, shopPhone: shop.shopPhone, shopAddress: shop.shopAddress,
  };
  return body.replace(/\{(\w+)\}/g, (m, k) => (k in v ? (v[k] === null || v[k] === undefined || v[k] === '' ? '-' : String(v[k])) : m))
    .replace(/\n📞\s*-?\s*$/, '').replace(/\s+$/, '');
}
export const waLink = (mobile: string | null | undefined, text: string) => mobile ? `https://wa.me/91${String(mobile).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(text)}` : null;
