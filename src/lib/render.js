// Los templates son funciones JS pre-compiladas por el plugin EJS de esbuild.
// No hay eval ni new Function en runtime → compatible con Cloudflare Workers.
import layoutFn      from '../views/layout.ejs';
import loginFn       from '../views/login.ejs';
import dashboardFn   from '../views/dashboard.ejs';
import checkinFn     from '../views/checkin.ejs';
import statsFn       from '../views/stats.ejs';
import screensaverFn from '../views/screensaver.ejs';
import signaFn       from '../views/signage.ejs';
import carouselAdminFn  from '../views/carousel-admin.ejs';
import membersListFn    from '../views/members/list.ejs';
import membersFormFn    from '../views/members/form.ejs';
import membersDetailFn  from '../views/members/detail.ejs';
import plansListFn      from '../views/plans/list.ejs';
import plansFormFn      from '../views/plans/form.ejs';

const TEMPLATES = {
  layout:           layoutFn,
  login:            loginFn,
  dashboard:        dashboardFn,
  checkin:          checkinFn,
  stats:            statsFn,
  screensaver:      screensaverFn,
  signage:          signaFn,
  'carousel-admin': carouselAdminFn,
  'members/list':   membersListFn,
  'members/form':   membersFormFn,
  'members/detail': membersDetailFn,
  'plans/list':     plansListFn,
  'plans/form':     plansFormFn,
};

function escape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&#34;')
    .replace(/'/g, '&#39;');
}

function rethrow(err) { throw err; }

export function render(name, data = {}) {
  const fn = TEMPLATES[name];
  if (!fn) throw new Error(`Template no encontrado: ${name}`);

  if (data.layout === false) {
    return fn(data, escape, null, rethrow);
  }

  const body = fn(data, escape, null, rethrow);
  return layoutFn({ ...data, body }, escape, null, rethrow);
}
