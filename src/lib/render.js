import ejs from 'ejs';

// Los templates se importan como strings de texto gracias al loader .ejs=text de esbuild
import layoutTpl from '../views/layout.ejs';
import loginTpl from '../views/login.ejs';
import dashboardTpl from '../views/dashboard.ejs';
import checkinTpl from '../views/checkin.ejs';
import statsTpl from '../views/stats.ejs';
import screensaverTpl from '../views/screensaver.ejs';
import carouselAdminTpl from '../views/carousel-admin.ejs';
import membersListTpl from '../views/members/list.ejs';
import membersFormTpl from '../views/members/form.ejs';
import membersDetailTpl from '../views/members/detail.ejs';
import plansListTpl from '../views/plans/list.ejs';
import plansFormTpl from '../views/plans/form.ejs';

const TEMPLATES = {
  layout: layoutTpl,
  login: loginTpl,
  dashboard: dashboardTpl,
  checkin: checkinTpl,
  stats: statsTpl,
  screensaver: screensaverTpl,
  'carousel-admin': carouselAdminTpl,
  'members/list': membersListTpl,
  'members/form': membersFormTpl,
  'members/detail': membersDetailTpl,
  'plans/list': plansListTpl,
  'plans/form': plansFormTpl,
};

/**
 * Renderiza un template EJS con sus datos.
 * Si data.layout === false, retorna el HTML sin envoltura de layout.
 */
export function render(name, data = {}) {
  const tpl = TEMPLATES[name];
  if (!tpl) throw new Error(`Template no encontrado: ${name}`);

  const opts = { rmWhitespace: false };

  if (data.layout === false) {
    return ejs.render(tpl, data, opts);
  }

  const body = ejs.render(tpl, data, opts);
  return ejs.render(layoutTpl, { ...data, body }, opts);
}
