const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const rx = require('rxjs');

function harness() {
  let dependencies = [];
  const storage = new Map([['token', 'old-account-token']]);
  const localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
  const roles = { AGENT: 'AGENT', A_MANAGER: 'A_MANAGER', SELLER: 'SELLER', ISV_SELLER: 'ISV_SELLER' };
  function load(relative) {
    const file = path.resolve(__dirname, '..', relative);
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
    }).outputText;
    vm.runInNewContext(code, {
      exports, localStorage, FormData: class {}, console: { log() {} },
      FileReader: class { readAsText(file) { this.onload({ target: { result: file.content } }); } },
      require(name) {
        if (name === '@angular/core') return {
          inject: () => dependencies.shift(), Injectable: () => value => value,
          Component: () => value => value, HostListener: () => () => {}, ViewEncapsulation: { None: 2 },
        };
        if (name === '@angular/common/http') return { HttpResponse: class {} };
        if (name === 'rxjs' || name === 'rxjs/operators') return rx;
        if (name === 'xlsx') return require('xlsx');
        if (name.endsWith('user.modal')) return { UserRole: roles };
        if (name.endsWith('environment')) return { environment: { apiUrl: '/api/' } };
        return {};
      },
    });
    return exports;
  }
  return { load, storage, inject: values => { dependencies = values; } };
}

function request(headers = {}) {
  return {
    method: 'GET', body: null, headers: { has: name => Object.keys(headers).some(key => key.toLowerCase() === name.toLowerCase()) },
    values: headers,
    clone: ({ setHeaders }) => request({ ...headers, ...setHeaders }),
  };
}

test('incoming marketplace token is processed even with an authenticated old session', () => {
  const h = harness();
  const { redirectGuard } = h.load('src/app/core/guard/redirect.guard.ts');
  h.inject([{ isAuthenticated: () => true }, { createUrlTree: () => 'redirected' }]);
  assert.equal(redirectGuard({ routeConfig: { path: 'login-token' }, queryParamMap: { get: () => 'new-account-token' } }), true);
  h.inject([{ isAuthenticated: () => true }, { createUrlTree: () => 'redirected' }]);
  assert.equal(redirectGuard({ routeConfig: { path: 'login' }, queryParamMap: { get: () => null } }), 'redirected');
});

test('manual contacts require name, business email and phone, but not optional fields', () => {
  const h = harness();
  const { AffiliateDatabaseComponent } = h.load('src/app/pages/affiliate/affiliate-database/affiliate-database.component.ts');
  const saved = [];
  h.inject([{ addContact: data => { saved.push(data); return rx.of({ status: 'success' }); } }]);
  const contacts = new AffiliateDatabaseComponent();
  contacts.load = () => {};
  contacts.loadStats = () => {};
  contacts.newContact = { name: 'Test', email: '', phone: '', company: '', designation: '', country: '' };
  contacts.addContact();
  assert.equal(saved.length, 0);
  assert.match(contacts.contactError, /required/);
  contacts.newContact.email = 'test@company.example';
  contacts.addContact();
  assert.equal(saved.length, 0);
  contacts.newContact.phone = '00123456789';
  contacts.addContact();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].company, '');
});

test('CSV accepts business email and phone number headers, quoted names, and leading-zero phones', () => {
  const h = harness();
  const { AffiliateDatabaseComponent } = h.load('src/app/pages/affiliate/affiliate-database/affiliate-database.component.ts');
  const imported = [];
  h.inject([{ importContacts: data => { imported.push(data); return rx.of({ data: { imported: data.length, errors: [] } }); } }]);
  const contacts = new AffiliateDatabaseComponent();
  contacts.load = () => {};
  contacts.loadStats = () => {};
  contacts.onFileImport({ target: { files: [{ name: 'contacts.csv', content: 'Name,Business email,Phone number\r\n"Test, Contact",test@company.example,00123456789' }], value: 'contacts.csv' } });
  assert.equal(imported.length, 1);
  assert.equal(imported[0][0].name, 'Test, Contact');
  assert.equal(imported[0][0].email, 'test@company.example');
  assert.equal(imported[0][0].phone, '00123456789');
  contacts.onFileImport({ target: { files: [{ name: 'invalid.csv', content: 'name,email\nTest,test@company.example' }], value: 'invalid.csv' } });
  assert.equal(imported.length, 1);
  assert.match(contacts.importError, /Phone number/);
});

test('token exchange preserves the new token and lands the new affiliate in CRM', () => {
  const h = harness();
  const { httpInterceptorInterceptor: intercept } = h.load('src/app/core/interceptor/http-interceptor.interceptor.ts');
  const { AuthService } = h.load('src/app/core/services/auth.service.ts');
  let destination;
  const router = { navigate: path => { destination = path[0]; } };
  let service;
  const http = { get(url, options) {
    h.inject([service, router, {}, {}]);
    return intercept(request(options.headers), req => {
      assert.equal(req.values.Authorization, 'Bearer new-account-token');
      return rx.of({ status: 'success', data: { id: 563, role_type: 'AGENT' } });
    });
  } };
  h.inject([http, router, {}]);
  service = new AuthService();
  service.loginByToken('new-account-token').subscribe();
  assert.equal(h.storage.get('token'), 'new-account-token');
  assert.equal(JSON.parse(h.storage.get('user')).id, 563);
  assert.equal(destination, '/affiliate/dashboard');
});

test('ordinary requests still receive the stored session token', () => {
  const h = harness();
  const { httpInterceptorInterceptor: intercept } = h.load('src/app/core/interceptor/http-interceptor.interceptor.ts');
  h.inject([{ getToken: () => 'current-token' }, {}, {}, {}]);
  intercept(request(), req => {
    assert.equal(req.values.Authorization, 'Bearer current-token');
    return rx.of({});
  }).subscribe();
});

test('CRM refresh loads category-expanded products, services and solutions', () => {
  const h = harness();
  const { CrmProductsComponent } = h.load('src/app/pages/crm/crm-products/crm-products.component.ts');
  const data = ['product', 'service', 'solution'].map((type, index) => ({ id: index + 1, item_type: type, item_name: type, item_logo: `${type}.png`, from_category: 'Assigned category' }));
  let calls = 0;
  h.inject([{ get: url => {
    assert.equal(url, '/api/seller/my-assignments');
    calls++;
    return rx.of({ success: true, data });
  } }, { user: { id: 563, role_type: 'AGENT' } }]);
  const catalog = new CrmProductsComponent();
  for (const [tab, type] of [['products', 'product'], ['services', 'service'], ['solutions', 'solution']]) {
    catalog.switchTab(tab);
    assert.equal(catalog.items.length, 1);
    assert.equal(catalog.items[0].name, type);
    assert.equal(catalog.getItemImage(catalog.items[0]), `${type}.png`);
  }
  catalog.refreshOnReturn();
  assert.equal(calls, 4);
});

test('affiliate and manager notification bells use personal notifications and persist read status', () => {
  for (const role of ['AGENT', 'A_MANAGER']) {
    const h = harness();
    const { CrmShellComponent } = h.load('src/app/pages/crm/crm-shell/crm-shell.component.ts');
    const updates = [];
    let failUpdate = false;
    h.inject([{ user: { id: 563, role_type: role } }, {
      get(url) {
        assert.equal(url, '/api/internal/crm/notifications?limit=10');
        return rx.of({ data: [
          { id: 11, title: 'Already read', message: 'Your customer registered', is_read: true },
          { id: 12, title: 'New opportunity', is_read: false },
        ] });
      },
      put(url) {
        updates.push(url);
        return failUpdate ? rx.throwError(() => new Error('Unavailable')) : rx.of({ status: 'success' });
      }
    }]);
    const shell = new CrmShellComponent();
    shell.ngOnInit();
    assert.equal(shell.notifications[0].text, 'Your customer registered');
    assert.equal(shell.notifications[1].text, 'New opportunity');
    assert.equal(shell.unreadCount, 1);
    shell.markRead(shell.notifications[1]);
    assert.equal(updates[0], '/api/internal/crm/notifications/12/read');
    assert.equal(shell.unreadCount, 0);
    shell.loadNotifications();
    failUpdate = true;
    shell.markAllRead();
    assert.equal(shell.unreadCount, 1);
    failUpdate = false;
    shell.markAllRead();
    assert.equal(updates.at(-1), '/api/internal/crm/notifications/read-all');
    assert.equal(shell.unreadCount, 0);
  }
});

test('other CRM roles retain their existing activity feed', () => {
  const h = harness();
  const { CrmShellComponent } = h.load('src/app/pages/crm/crm-shell/crm-shell.component.ts');
  h.inject([{ user: { id: 1, role_type: 'ADMIN' } }, {
    get(url) {
      assert.equal(url, '/api/internal/crm/activities?limit=10');
      return rx.of({ data: [{ id: 1, subject: 'Existing activity' }] });
    }
  }]);
  const shell = new CrmShellComponent();
  shell.ngOnInit();
  assert.equal(shell.notifications[0].text, 'Existing activity');
  shell.markAllRead();
  assert.equal(shell.unreadCount, 0);
});

test('referred customer tabs show pending signups, reset pagination, and ignore stale responses', () => {
  const h = harness();
  const { AffiliateCustomersComponent } = h.load('src/app/pages/affiliate/affiliate-customers/affiliate-customers.component.ts');
  const verified = new rx.Subject();
  let fail = false;
  h.inject([{
    getCustomers: () => verified,
    getRegistrations: params => {
      assert.equal(params.page, 1);
      return fail ? rx.throwError(() => new Error('Offline')) : rx.of({ data: [{ id: 10, registration_status: 'Awaiting verification' }], total: 1 });
    }
  }]);
  const component = new AffiliateCustomersComponent();
  component.ngOnInit();
  component.page = 3;
  component.switchView('registrations');
  assert.equal(component.page, 1);
  assert.equal(component.customers[0].id, 10);
  verified.next({ data: [{ id: 99 }], total: 1 });
  assert.equal(component.customers[0].id, 10);
  component.page = 4;
  component.applySearch();
  assert.equal(component.page, 1);
  fail = true;
  component.load();
  assert.equal(component.loading, false);
  assert.equal(component.customers.length, 0);
  assert.match(component.error, /Unable to load/);
});

test('affiliate customer progress labels catalog engagement events', () => {
  const h = harness();
  const { AffiliateCustomersComponent } = h.load('src/app/pages/affiliate/affiliate-customers/affiliate-customers.component.ts');
  h.inject([{ getCustomers: () => rx.of({ data: [], total: 0 }) }]);
  const component = new AffiliateCustomersComponent();
  assert.equal(component.activityLabel('catalog_engagement'), 'Scrolled catalog page');
  assert.equal(component.activityLabel('brochure_download'), 'Downloaded brochure');
});

test('affiliate dashboard loads paid-style UTM click analytics', () => {
  const h = harness();
  const payload = { links: {
    total_clicks: 25, clicks_7_days: 7, clicks_30_days: 20,
    unique_visitors: 18, registrations: 4, verified_customers: 3,
    click_to_registration_rate: 16, active: 2, total: 3,
  } };
  h.inject([{ getAffiliateDashboard: () => rx.of({ data: payload }) }, { user: { role_type: 'AGENT' } }]);
  const { AffiliateDashboardComponent } = h.load('src/app/pages/affiliate/affiliate-dashboard/affiliate-dashboard.component.ts');
  const component = new AffiliateDashboardComponent();
  component.ngOnInit();
  assert.equal(component.data.links.total_clicks, 25);
  assert.equal(component.data.links.unique_visitors, 18);
  assert.equal(component.data.links.click_to_registration_rate, 16);
});

test('affiliate dashboard metrics use a responsive 3 by 4 grid', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/app/pages/affiliate/affiliate-dashboard/affiliate-dashboard.component.ts'), 'utf8');
  assert.match(source, /class="affiliate-metrics-grid"/);
  assert.match(source, /grid-template-columns:\s*repeat\(3,/);
  assert.match(source, /grid-template-rows:\s*repeat\(4,/);
  assert.match(source, /\.affiliate-metrics-grid \.neo-stat[\s\S]*padding:\s*0\.7rem 1rem/);
  assert.match(source, /max-width:\s*1024px[\s\S]*repeat\(2,/);
  assert.match(source, /max-width:\s*640px[\s\S]*minmax\(0, 1fr\)/);
});

test('affiliate dashboard navigation is placed before its heading', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/app/pages/affiliate/affiliate-dashboard/affiliate-dashboard.component.ts'), 'utf8');
  const nav = source.indexOf('class="affiliate-dashboard-nav"');
  const heading = source.indexOf('<h1 class="crm-title">Affiliate Dashboard</h1>');
  assert.ok(nav > -1 && heading > -1 && nav < heading);
  for (const label of ['My Customers', 'My Opportunities', 'My Database', 'Campaigns', 'My Links', 'Customer Scores']) {
    assert.equal(source.match(new RegExp(`>${label}<`, 'g'))?.length, 1, `${label} should appear once`);
  }
});
