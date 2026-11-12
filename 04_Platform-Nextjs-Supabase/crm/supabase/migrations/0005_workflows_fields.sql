-- AGS Services Master – pro CRM · 0005 workflow steps and form fields (Phase 1c, 12 Nov 2026)
set local search_path = crm, public;

alter table departments add column if not exists form_fields jsonb not null default '[]';
alter table departments add column if not exists updated_at timestamptz not null default now();
create trigger departments_audit after insert or update or delete on departments for each row execute function crm.audit_row();
create trigger services_audit after insert or update or delete on services for each row execute function crm.audit_row();
create trigger workflow_steps_audit after insert or update or delete on workflow_steps for each row execute function crm.audit_row();

-- Default steps per kind of department (same steps and messages as Sheet edition 3.0)
with s(kind, key, label, label_te, sort, outcome, template_key) as (values
  ('ttd','requested','Requested','అభ్యర్థన',1,'open','request_received'),
  ('ttd','attempting','Attempting','ప్రయత్నిస్తున్నాం',2,'open','request_received'),
  ('ttd','dip_registered','Lucky dip – registered','లక్కీ డిప్ నమోదు',3,'open','dip_registered'),
  ('ttd','dip_selected','Lucky dip – selected','లక్కీ డిప్ ఎంపిక',4,'open','dip_selected'),
  ('ttd','booked','Booked','బుక్ అయింది',5,'success','booked'),
  ('ttd','completed','Completed','పూర్తయింది',6,'success',null),
  ('ttd','not_booked','Not booked','బుక్ కాలేదు',7,'failed','not_booked_refund_pending'),
  ('ttd','dip_not_selected','Lucky dip – not selected','లక్కీ డిప్ ఎంపిక కాలేదు',8,'failed','dip_not_selected'),
  ('ttd','payment_failed','Paid, no ticket','డబ్బు కట్, టికెట్ రాలేదు',9,'failed','payment_failed'),
  ('ttd','cancelled','Cancelled','రద్దు',10,'cancelled','cancelled'),
  ('travel','requested','Requested','అభ్యర్థన',1,'open','travel_received'),
  ('travel','attempting','Attempting','ప్రయత్నిస్తున్నాం',2,'open','travel_received'),
  ('travel','booked','Booked','బుక్ అయింది',3,'success','travel_booked'),
  ('travel','completed','Journey done','ప్రయాణం పూర్తి',4,'success',null),
  ('travel','not_booked','Not booked','బుక్ కాలేదు',5,'failed','travel_not_booked'),
  ('travel','cancelled','Cancelled','రద్దు',6,'cancelled','travel_cancelled'),
  ('application','received','Received','స్వీకరించాం',1,'open','order_received'),
  ('application','applied','Applied','దరఖాస్తు చేశాం',2,'open','app_applied'),
  ('application','in_process','In process','ప్రాసెస్‌లో ఉంది',3,'open','app_in_process'),
  ('application','ready','Ready to collect','తీసుకెళ్లవచ్చు',4,'open','app_ready'),
  ('application','delivered','Delivered','అందజేశాం',5,'success','order_completed'),
  ('application','rejected','Rejected','తిరస్కరించబడింది',6,'failed','app_rejected'),
  ('application','cancelled','Cancelled','రద్దు',7,'cancelled','cancelled'),
  ('quick','completed','Completed','పూర్తయింది',1,'success','order_completed'),
  ('quick','cancelled','Cancelled','రద్దు',2,'cancelled',null)
)
insert into workflow_steps (department_id, key, label, label_te, sort, outcome, template_key)
select d.id, s.key, s.label, s.label_te, s.sort, s.outcome, s.template_key from s join departments d on d.kind::text = s.kind
on conflict (department_id, key) do nothing;

-- Default form fields. stage: 'request' = asked when the booking is made, 'result' = filled when it is done.
update departments set form_fields = '[
  {"key":"ttd_login","label":"TTD login used","type":"text","stage":"result"},
  {"key":"slot","label":"Slot / reporting time","type":"text","stage":"result"},
  {"key":"reporting_point","label":"Reporting point","type":"text","stage":"result"},
  {"key":"room","label":"Room / cottage","type":"text","stage":"result"},
  {"key":"check_out","label":"Check-out date (rooms)","type":"date","stage":"result"}
]' where kind = 'ttd' and form_fields = '[]';
update departments set form_fields = '[
  {"key":"from","label":"From","label_te":"నుండి","type":"text","stage":"request","required":true},
  {"key":"to","label":"To","label_te":"వరకు","type":"text","stage":"request","required":true},
  {"key":"class","label":"Class","type":"text","stage":"request"},
  {"key":"quota","label":"Quota","type":"select","options":["General","Tatkal","Premium Tatkal","Ladies","Senior Citizen","Lower Berth"],"stage":"request"},
  {"key":"operator","label":"Operator / airline","type":"text","stage":"result"},
  {"key":"vehicle_no","label":"Train / bus / flight no","type":"text","stage":"result"},
  {"key":"departure","label":"Departure time","type":"text","stage":"result"},
  {"key":"boarding","label":"Boarding point","type":"text","stage":"result"},
  {"key":"seat","label":"Coach / seat / berth","type":"text","stage":"result"},
  {"key":"ticket_status","label":"Ticket status","type":"select","options":["CNF","RAC","WL","RLWL / PQWL","Partly CNF"],"stage":"result"}
]' where kind = 'travel' and form_fields = '[]';
update departments set form_fields = '[
  {"key":"portal","label":"Portal / office applied at","type":"text","stage":"result"},
  {"key":"reason","label":"Rejection reason","type":"textarea","stage":"result"}
]' where kind = 'application' and form_fields = '[]';
update departments set form_fields = '[
  {"key":"bill_no","label":"Bill / consumer / reference no","type":"text","stage":"request"}
]' where kind = 'quick' and form_fields = '[]';
