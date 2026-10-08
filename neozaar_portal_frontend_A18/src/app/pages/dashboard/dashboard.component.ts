import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserserviceService } from '../../core/services/userservice.service';
import { ToasterService } from '../../shared/providers/toaster/toaster.service';
import { UserRole } from '../../core/modal/user.modal';
import { environment } from '../../../environments/environment';
declare var ApexCharts: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'dashboard.component.html',
  // styleUrls: ['dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  dashboarddata: any = {
    products: {
      total_products: 0,
      active_products: 0,
      draft_products: 0,
      unpublished_products: 0
    },
    services: {
      total_services: 0,
      active_services: 0,
      draft_services: 0,
      unpublished_services: 0
    },
    solutions: {
      total_solutions: 0,
      active_solutions: 0,
      draft_solutions: 0,
      unpublished_solutions: 0
    },
    leads: {
      total_leads: 0,
      won_leads: 0,
      lost_leads: 0,
      pending_leads: 0
    },
    totalProductCreatedInLastWeek: {},
    totalLeadsCreatedInLastWeek: {}
  };

  loading = true;
  error: string | null = null;
  private productChart: any;
  private leadChart: any;

  // Weekdays array for proper ordering
  private weekDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  private weekdayNames: { [key: string]: string } = {
    'sun': 'Sun',
    'mon': 'Mon',
    'tue': 'Tue',
    'wed': 'Wed',
    'thu': 'Thu',
    'fri': 'Fri',
    'sat': 'Sat'
  };
  userrole: any;
  userole: any;

  // Get Started modal
  showGetStarted = false;
  getStartedView: 'options' | 'newuser' | 'login' = 'options';
  getStartedEmail = '';
  getStartedPassword = '';
  getStartedShowPw = false;
  getStartedLoading = false;
  baseUrl = environment.frontendUrl;

  constructor(
    private authService: AuthService,
    private userService: UserserviceService,
    private http: HttpClient,
    private router: Router,
    private toaster: ToasterService
  ) {

  }


  ngOnInit(): void {
    this.userrole = this.authService.getCurrentUser()?.role_type;

    // CRM-tier roles belong in the CRM dashboard, not the ISV Executive Dashboard.
    const crmRoles = [
      UserRole.SELLER,
      UserRole.ISV_SELLER,
    ];
    if (crmRoles.includes(this.userrole as UserRole)) {
      this.router.navigate(['/crm/dashboard']);
      return;
    }

    // Affiliates go straight to their dashboard; affiliate managers stay here.
    if (this.userrole === UserRole.AGENT) {
      this.router.navigate(['/affiliate/dashboard']);
      return;
    }

    this.getDashboarddata();
    this.userole = this.userrole;
  }

  ngAfterViewInit(): void {
    // Charts will be rendered after data is fetched
  }

  ngOnDestroy(): void {
    // Clean up charts to prevent memory leaks
    if (this.productChart) {
      this.productChart.destroy();
    }
    if (this.leadChart) {
      this.leadChart.destroy();
    }
  }

  getDashboarddata(): void {
    this.loading = true;
    this.error = null;

    this.userService.getdashboard().subscribe({
      next: (res: any) => {
        this.loading = false;

        if (res && res.status === 'success' && res.data) {
          this.dashboarddata = res.data;
          // Process and render product chart
          this.processAndRenderProductChart();

          // Process and render lead chart
          this.processAndRenderLeadChart();
        } else {
          this.error = 'No dashboard data found';
          console.error('Dashboard data not found:', res);
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.error = 'Failed to load dashboard data';
        console.error('Error fetching dashboard data:', err);
      }
    });
  }

  getLeadDataFunnel(event: Event): void {
    const days = (event.target as HTMLSelectElement).value;
    console.log('Selected days:', days);

    // API call later
    this.userService.getLeadDataFilter(days).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success' && res.data) {
          this.dashboarddata.leads.total_leads = res.data.leads.total_leads;
          this.dashboarddata.leads.won_leads = res.data.leads.won_leads;
          this.dashboarddata.leads.lost_leads = res.data.leads.lost_leads;
          this.dashboarddata.leads.pending_leads = res.data.leads.pending_leads;
          console.log('Lead funnel data:', this.dashboarddata.leads.total_leads);
        } else {
          console.error('Lead funnel data not found:', res);
        }
      },
      error: (err: any) => {
        console.error('Error fetching lead funnel data:', err);
      }
    });
  }

  private processAndRenderProductChart(): void {
    if (!this.dashboarddata?.totalProductCreatedInLastWeek ||
      Object.keys(this.dashboarddata.totalProductCreatedInLastWeek).length === 0) {
      this.renderEmptyProductChart();
      return;
    }

    // Get data for all 7 days of week
    const productData = this.dashboarddata.totalProductCreatedInLastWeek;

    // Prepare arrays for chart
    const categories: string[] = [];
    const totalProducts: number[] = [];
    const activeProducts: number[] = [];
    const draftProducts: number[] = [];
    const unpublishedProducts: number[] = [];

    // Fill data for each day of week
    this.weekDays.forEach(day => {
      categories.push(this.weekdayNames[day]);

      if (productData[day]) {
        totalProducts.push(productData[day].total || 0);
        activeProducts.push(productData[day].active || 0);
        draftProducts.push(productData[day].draft || 0);
        unpublishedProducts.push(productData[day].unpublished || 0);
      } else {
        totalProducts.push(0);
        activeProducts.push(0);
        draftProducts.push(0);
        unpublishedProducts.push(0);
      }
    });

    this.renderProductChart(categories, totalProducts, activeProducts, draftProducts, unpublishedProducts);
  }

  private renderEmptyProductChart(): void {
    // Destroy existing chart if it exists
    if (this.productChart) {
      this.productChart.destroy();
    }

    const chartElement = document.querySelector("#salesChart");
    if (!chartElement) return;

    const emptyData = [0, 0, 0, 0, 0, 0, 0];
    const options = {
      chart: {
        type: 'area',
        height: 350,
        zoom: { enabled: false },
        toolbar: { show: false },
        background: 'transparent'
      },
      series: [
        { name: 'Total Products', data: emptyData },
        { name: 'Active Products', data: emptyData },
        { name: 'Draft Products', data: emptyData },
        { name: 'Unpublished Products', data: emptyData }
      ],
      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
      xaxis: {
        categories: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        labels: {
          style: {
            colors: '#6B7280',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#6B7280',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif'
          }
        },
        min: 0
      },
      title: {
        text: 'Products Overview (Last 7 Days)',
        align: 'left',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#1f2937',
          fontFamily: 'Inter, sans-serif'
        }
      },
      subtitle: {
        text: 'No data available for the past week',
        align: 'left',
        style: {
          fontSize: '14px',
          color: '#6b7280',
          fontFamily: 'Inter, sans-serif'
        }
      },
      legend: {
        show: false
      },
      noData: {
        text: 'No product data available',
        align: 'center',
        verticalAlign: 'middle'
      }
    };

    this.productChart = new ApexCharts(chartElement, options);
    this.productChart.render();
  }

  private processAndRenderLeadChart(): void {
    if (!document.querySelector('#usersChart')) return;
    if (!this.dashboarddata?.totalLeadsCreatedInLastWeek ||
      Object.keys(this.dashboarddata.totalLeadsCreatedInLastWeek).length === 0) {
      this.renderEmptyLeadChart();
      return;
    }

    // Get data for all 7 days of week
    const leadData = this.dashboarddata.totalLeadsCreatedInLastWeek;

    // Prepare arrays for chart
    const categories: string[] = [];
    const totalLeads: number[] = [];
    const wonLeads: number[] = [];
    const lostLeads: number[] = [];
    const pendingLeads: number[] = [];

    // Fill data for each day of week
    this.weekDays.forEach(day => {
      categories.push(this.weekdayNames[day]);

      if (leadData[day]) {
        totalLeads.push(leadData[day].total || 0);
        wonLeads.push(leadData[day].won || 0);
        lostLeads.push(leadData[day].lost || 0);
        pendingLeads.push(leadData[day].pending || 0);
      } else {
        totalLeads.push(0);
        wonLeads.push(0);
        lostLeads.push(0);
        pendingLeads.push(0);
      }
    });

    this.renderLeadChart(categories, totalLeads, wonLeads, lostLeads, pendingLeads);
  }

  private renderEmptyLeadChart(): void {
    // Destroy existing chart if it exists
    if (this.leadChart) {
      this.leadChart.destroy();
    }

    const chartElement = document.querySelector("#usersChart");
    if (!chartElement) return;

    const emptyData = [0, 0, 0, 0, 0, 0, 0];
    const options = {
      chart: {
        type: 'area',
        height: 350,
        zoom: { enabled: false },
        toolbar: { show: false },
        background: 'transparent'
      },
      series: [
        { name: 'Total Leads', data: emptyData },
        { name: 'Won Leads', data: emptyData },
        { name: 'Lost Leads', data: emptyData },
        { name: 'Pending Leads', data: emptyData }
      ],
      colors: ['#8B5CF6', '#10B981', '#EF4444', '#F59E0B'],
      xaxis: {
        categories: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        labels: {
          style: {
            colors: '#6B7280',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#6B7280',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif'
          }
        },
        min: 0
      },
      title: {
        text: 'Leads Overview (Last 7 Days)',
        align: 'left',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#1f2937',
          fontFamily: 'Inter, sans-serif'
        }
      },
      subtitle: {
        text: 'No data available for the past week',
        align: 'left',
        style: {
          fontSize: '14px',
          color: '#6b7280',
          fontFamily: 'Inter, sans-serif'
        }
      },
      legend: {
        show: false
      },
      noData: {
        text: 'No lead data available',
        align: 'center',
        verticalAlign: 'middle'
      }
    };

    this.leadChart = new ApexCharts(chartElement, options);
    this.leadChart.render();
  }

  private renderProductChart(categories: string[], total: number[], active: number[], draft: number[], unpublished: number[]): void {
    // Destroy existing chart if it exists
    if (this.productChart) {
      this.productChart.destroy();
    }

    // Check if element exists
    const chartElement = document.querySelector("#salesChart");
    if (!chartElement) return;

    const options = {
      chart: {
        type: 'area',
        height: 350,
        zoom: { enabled: false },
        toolbar: { show: true },
        background: 'transparent'
      },
      series: [
        { name: 'Total Products', data: total },
        { name: 'Active Products', data: active },
        { name: 'Draft Products', data: draft },
        { name: 'Unpublished Products', data: unpublished }
      ],
      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
      xaxis: {
        categories: categories,
        labels: {
          style: {
            colors: '#6B7280',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif'
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#6B7280',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif'
          }
        },
        min: 0
      },
      stroke: {
        curve: 'smooth',
        width: 3,
        lineCap: 'round'
      },
      fill: {
        type: 'gradient',
        gradient: {
          opacityFrom: 0.4,
          opacityTo: 0.1,
          stops: [0, 100]
        }
      },
      title: {
        text: 'Products Overview (Last 7 Days)',
        align: 'left',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#1f2937',
          fontFamily: 'Inter, sans-serif'
        },
        offsetY: 10
      },
      subtitle: {
        text: 'Weekly product creation and status trends',
        align: 'left',
        style: {
          fontSize: '14px',
          color: '#6b7280',
          fontFamily: 'Inter, sans-serif'
        },
        offsetY: 35
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
        itemMargin: { horizontal: 15, vertical: 8 },
        markers: {
          width: 10,
          height: 10,
          radius: 5
        }
      },
      grid: {
        borderColor: '#E5E7EB',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
        padding: {
          top: 20,
          right: 20,
          bottom: 0,
          left: 0
        }
      },
      tooltip: {
        x: { show: true },
        y: {
          formatter: (value: number) => `${value} product${value !== 1 ? 's' : ''}`
        },
        style: {
          fontFamily: 'Inter, sans-serif'
        }
      },
      dataLabels: {
        enabled: false
      },
      markers: {
        size: 4,
        strokeWidth: 2,
        strokeColors: '#fff',
        hover: {
          size: 6
        }
      }
    };

    this.productChart = new ApexCharts(chartElement, options);
    this.productChart.render();
  }

  private renderLeadChart(categories: string[], total: number[], won: number[], lost: number[], pending: number[]): void {
    if (this.leadChart) {
      this.leadChart.destroy();
    }

    const chartElement = document.querySelector("#usersChart");
    if (!chartElement) return;

    const options = {
      chart: {
        type: 'area',
        height: 350,
        zoom: { enabled: false },
        toolbar: { show: true },
        background: 'transparent'
      },
      series: [
        { name: 'Total Leads', data: total },
        { name: 'Won Leads', data: won },
        { name: 'Lost Leads', data: lost },
        { name: 'Pending Leads', data: pending }
      ],
      colors: ['#8B5CF6', '#10B981', '#EF4444', '#F59E0B'],
      xaxis: {
        categories: categories,
        labels: {
          style: {
            colors: '#6B7280',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif'
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#6B7280',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif'
          }
        },
        min: 0
      },
      stroke: {
        curve: 'smooth',
        width: 3,
        lineCap: 'round'
      },
      fill: {
        type: 'gradient',
        gradient: {
          opacityFrom: 0.3,
          opacityTo: 0.1,
          stops: [0, 100]
        }
      },
      title: {
        text: 'Leads Overview (Last 7 Days)',
        align: 'left',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#1f2937',
          fontFamily: 'Inter, sans-serif'
        },
        offsetY: 10
      },
      subtitle: {
        text: 'Lead generation and conversion trends',
        align: 'left',
        style: {
          fontSize: '14px',
          color: '#6b7280',
          fontFamily: 'Inter, sans-serif'
        },
        offsetY: 35
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
        itemMargin: { horizontal: 15, vertical: 8 },
        markers: {
          width: 10,
          height: 10,
          radius: 5
        }
      },
      grid: {
        borderColor: '#E5E7EB',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
        padding: {
          top: 20,
          right: 20,
          bottom: 0,
          left: 0
        }
      },
      tooltip: {
        x: { show: true },
        y: {
          formatter: (value: number) => `${value} lead${value !== 1 ? 's' : ''}`
        },
        style: {
          fontFamily: 'Inter, sans-serif'
        }
      },
      dataLabels: {
        enabled: false
      },
      markers: {
        size: 4,
        strokeWidth: 2,
        strokeColors: '#fff',
        hover: {
          size: 6
        }
      }
    };

    this.leadChart = new ApexCharts(chartElement, options);
    this.leadChart.render();
  }

  // Refresh dashboard data
  refreshDashboard(): void {
    this.getDashboarddata();
  }

  // Helper methods for UI
  getFormattedDate(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Calculate win rate percentage
  calculateWinRate(): number {
    const won = this.dashboarddata.leads.won_leads;
    const total = this.dashboarddata.leads.total_leads;

    if (total === 0) return 0;
    return Math.round((won / total) * 100);
  }

  // Calculate completion percentage for products
  calculateProductsCompletion(): number {
    const active = this.dashboarddata.products.active_products;
    const total = this.dashboarddata.products.total_products;

    if (total === 0) return 0;
    return Math.round((active / total) * 100);
  }

  // Calculate completion percentage for services
  calculateServicesCompletion(): number {
    const active = this.dashboarddata.services.active_services;
    const total = this.dashboarddata.services.total_services;

    if (total === 0) return 0;
    return Math.round((active / total) * 100);
  }

  // Calculate completion percentage for solutions
  calculateSolutionsCompletion(): number {
    const active = this.dashboarddata.solutions.active_solutions;
    const total = this.dashboarddata.solutions.total_solutions;

    if (total === 0) return 0;
    return Math.round((active / total) * 100);
  }

  onGetStartedLogin(): void {
    if (!this.getStartedEmail || !this.getStartedPassword) {
      this.toaster.setToaster('error', 'Error', 'Please enter email and password');
      return;
    }
    this.getStartedLoading = true;
    this.authService.login({ email: this.getStartedEmail, password: this.getStartedPassword }).subscribe({
      next: () => {
        this.getStartedLoading = false;
        this.showGetStarted = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.getStartedLoading = false;
        this.toaster.setToaster('error', 'Login Failed', err?.error?.message || 'Invalid credentials');
      }
    });
  }
}
