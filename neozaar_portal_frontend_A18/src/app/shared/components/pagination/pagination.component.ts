import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface pagination{
  current_page: number,
  next_page: number | null,
  prev_page: number | null,
  pages: number[]
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [FormsModule,CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss'
})
export class PaginationComponent {

// @Input() data:pagination | null = null
@Input() data:any
@Output() pageChange = new EventEmitter<any>()


changePage(page: number){
  this.pageChange.emit(page)
}

}
