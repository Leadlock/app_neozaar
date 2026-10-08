declare var $: any;

import {
  Component,
  forwardRef,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  Renderer2
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-cleditor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cleditor.component.html',
  styleUrls: ['./cleditor.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CleditorComponent),
      multi: true
    }
  ]
})
export class CleditorComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {

  @ViewChild('editorRef') editorRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fallbackContent', { static: false }) fallbackContentRef?: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput', { static: false }) imageInputRef?: ElementRef<HTMLInputElement>;
  
  @Input() editorId = `cleditor-${Math.random().toString(36).substring(2)}`;
  @Input() height = 250;
  @Input() width = '100%';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  @Input() maxImageSize = 5242880; // 5MB in bytes
  @Input() imageUploadUrl?: string; // Optional: URL for uploading images
  @Input() disableImagePaste = true; // Changed from disableAllPaste to disableImagePaste
  @Output() contentChange = new EventEmitter<string>();
  @Output() imageUpload = new EventEmitter<{file: File, url: string}>();

  value: string = '';
  private editorInstance: any = null;
  private iframeBody: HTMLElement | null = null;
  showPasteWarning = false;
  warningMessage = 'Pasting images or files is not allowed. Please use the upload button for images.';
  isInitialized = false;
  showFallback = false;
  private isDestroyed = false;
  isUploadingImage = false;
  uploadProgress = 0;

  // ControlValueAccessor methods
  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  constructor(
    private cdRef: ChangeDetectorRef,
    private renderer: Renderer2,
    private sanitizer: DomSanitizer
  ) {}

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.value = value || '';
    
    if (this.isInitialized && !this.showFallback && this.editorInstance) {
      this.updateCLEditorContent(this.value);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.editorInstance) {
      try {
        this.editorInstance.disable(isDisabled);
      } catch (error) {
        console.warn('Error setting disabled state:', error);
      }
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeEditor();
    }, 0);
  }

  private initializeEditor(): void {
    if (this.isDestroyed) return;

    const jq = (window as any).$;
    if (!jq || !jq.fn || typeof jq.fn.cleditor !== 'function') {
      console.warn('CLEditor not available. Using fallback editor.');
      this.showFallback = true;
      this.cdRef.detectChanges();
      return;
    }

    if (!this.editorRef?.nativeElement) {
      console.error('Editor reference not available');
      this.showFallback = true;
      this.cdRef.detectChanges();
      return;
    }

    try {
      const textarea = this.editorRef.nativeElement;
      const el = jq(textarea);
      
      if (this.value) {
        el.val(this.value);
      }
      
      textarea.id = this.editorId;
      
      this.editorInstance = el.cleditor({
        width: this.width,
        height: this.height,
        controls: 'bold italic underline strikethrough subscript superscript | font size style | color highlight removeformat | bullets numbering | outdent indent | alignleft center alignright justify | undo redo | image link unlink | cut copy paste | source',
        useCSS: false,
        bodyStyle: 'margin: 8px; font: 14px Arial, sans-serif; cursor: text; min-height: 100px;',
        fonts: 'Arial,Helvetica,sans-serif',
        colors: 'FFFFFF,000000,FF0000,00FF00,0000FF,FFFF00,FF00FF,00FFFF',
        sizes: '1,2,3,4,5,6,7',
        styles: [['Paragraph', '<p>'], ['Header 1', '<h1>'], ['Header 2', '<h2>'], ['Header 3', '<h3>']],
        docType: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
        docCSSFile: '',
        useBundledStyleSheet: true
      })[0];
      
      this.isInitialized = true;
      
      this.setupCustomImageButton();
      this.setupNativeEventListeners();
      
      if (this.value) {
        setTimeout(() => {
          this.updateCLEditorContent(this.value);
        }, 100);
      }
      
      if (this.disabled) {
        this.editorInstance.disable(true);
      }
      
    } catch (error) {
      console.error('Error initializing CLEditor:', error);
      this.showFallback = true;
      this.cdRef.detectChanges();
    }
  }

  private setupCustomImageButton(): void {
    if (!this.editorInstance) return;
    
    const toolbar = this.editorInstance.$toolbar[0];
    if (!toolbar) return;
    
    // Listen for any toolbar button click to sync value back to form control
    toolbar.addEventListener('mousedown', () => {
      setTimeout(() => this.updateValueFromIframe(), 200);
    });
    
    const imageButton = toolbar.querySelector('span[title="Insert Image"]');
    if (imageButton) {
      const jq = (window as any).$;
      const $button = jq(imageButton);
      
      $button.off('click');
      
      $button.on('click', (e: Event) => {
        e.preventDefault();
        this.openImageDialog();
      });
    }
  }

  openImageDialog(): void {
    if (this.disabled) return;
    
    const input = this.renderer.createElement('input');
    this.renderer.setAttribute(input, 'type', 'file');
    this.renderer.setAttribute(input, 'accept', this.allowedImageTypes.join(','));
    this.renderer.setAttribute(input, 'multiple', 'false');
    this.renderer.setStyle(input, 'display', 'none');
    
    this.renderer.listen(input, 'change', (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.handleImageUpload(target.files[0]);
      }
      this.renderer.removeChild(document.body, input);
    });
    
    this.renderer.appendChild(document.body, input);
    input.click();
  }

  private setupNativeEventListeners(): void {
    const iframe = this.editorInstance?.$frame?.[0];
    if (!iframe) return;
    
    const onIframeLoad = () => {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) return;
      
      this.iframeBody = iframeDoc.body;
      if (!this.iframeBody) return;
      
      // Add event listeners
      this.iframeBody.addEventListener('input', () => this.updateValueFromIframe());
      this.iframeBody.addEventListener('keyup', () => this.updateValueFromIframe());
      this.iframeBody.addEventListener('paste', (e) => this.handleIframePaste(e));
      this.iframeBody.addEventListener('change', () => this.updateValueFromIframe());
      this.iframeBody.addEventListener('blur', () => {
        this.updateValueFromIframe();
        this.onTouched();
      });
      this.iframeBody.addEventListener('focus', () => this.onTouched());
      
      // Also listen for mouseup to catch toolbar formatting actions
      this.iframeBody.addEventListener('mouseup', () => {
        setTimeout(() => this.updateValueFromIframe(), 100);
      });
      
      // Prevent image/file drag and drop
      this.iframeBody.addEventListener('dragover', (e) => this.handleDragOver(e));
      this.iframeBody.addEventListener('drop', (e) => this.handleDrop(e));
      
      this.setIframePlaceholder();
    };
    
    if (iframe.contentDocument?.readyState === 'complete') {
      onIframeLoad();
    } else {
      iframe.addEventListener('load', onIframeLoad);
    }
  }

  private handleDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Check if dragging files
    if (event.dataTransfer && event.dataTransfer.types.includes('Files')) {
      event.dataTransfer.dropEffect = 'none';
      this.showPasteWarningMessage();
    }
  }

  private handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.showPasteWarningMessage();
    }
  }

  private updateValueFromIframe(): void {
    if (!this.iframeBody || !this.editorInstance) return;
    
    let html = this.iframeBody.innerHTML;
    
    // Check if content is just the placeholder
    if (html === `<p style="color: #999; margin: 0;">${this.placeholder}</p>` || 
        html === '<p></p>' || html === '<br>' || !html.trim()) {
      // Content is empty/placeholder - set form value to empty string
      if (this.value !== '') {
        this.value = '';
        this.onChange(this.value);
        this.contentChange.emit(this.value);
      }
      return;
    }
    
    // Only sanitize output, don't rewrite iframe content during live editing
    // This prevents desync between CLEditor's internal state and the form value
    if (this.editorInstance.updateTextArea) {
      this.editorInstance.updateTextArea();
    }
    
    const textarea = this.editorRef.nativeElement;
    const rawValue = textarea.value || '';
    const newValue = this.cleanHtml(rawValue);
    
    if (this.value !== newValue) {
      this.value = newValue;
      this.onChange(this.value);
      this.onTouched();
      this.contentChange.emit(this.value);
    }
  }

  private updateCLEditorContent(html: string): void {
    if (!this.editorInstance || !this.iframeBody) return;
    
    const cleanHtml = this.cleanHtml(html);
    this.iframeBody.innerHTML = cleanHtml;
    
    if (this.editorInstance.updateTextArea) {
      this.editorInstance.updateTextArea();
    }
    
    this.value = this.editorRef.nativeElement.value || '';
  }

  private setIframePlaceholder(): void {
    if (!this.iframeBody) return;
    
    if (!this.iframeBody.innerHTML.trim() || this.iframeBody.innerHTML === '<p></p>') {
      this.iframeBody.innerHTML = `<p style="color: #999; margin: 0;">${this.placeholder}</p>`;
    }
  }

  private handleIframePaste(event: ClipboardEvent): void {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;
    
    // Check if clipboard contains files (images or other files)
    const hasFiles = Array.from(clipboardData.items).some(item => 
      item.kind === 'file' || 
      item.type.startsWith('image/') ||
      item.type.startsWith('application/') // documents
    );
    
    // Only block pasting if disableImagePaste is true AND clipboard contains files
    if (this.disableImagePaste && hasFiles) {
      event.preventDefault();
      event.stopPropagation();
      
      this.showPasteWarningMessage();
      return;
    }
    
    // Allow text/HTML paste to continue normally
    // This includes plain text, formatted text, links, etc.
    setTimeout(() => {
      this.updateValueFromIframe();
    }, 0);
  }

  private showPasteWarningMessage(): void {
    this.showPasteWarning = true;
    this.cdRef.detectChanges();
    
    setTimeout(() => {
      this.showPasteWarning = false;
      this.cdRef.detectChanges();
    }, 3000);
  }

  async handleImageUpload(file: File): Promise<void> {
    if (!file) return;
    
    if (!this.allowedImageTypes.includes(file.type)) {
      this.showWarningMessage(`Invalid file type. Allowed types: ${this.allowedImageTypes.join(', ')}`);
      return;
    }
    
    if (file.size > this.maxImageSize) {
      this.showWarningMessage(`File too large. Maximum size: ${this.maxImageSize / 1024 / 1024}MB`);
      return;
    }
    
    try {
      this.isUploadingImage = true;
      this.uploadProgress = 0;
      this.cdRef.detectChanges();
      
      let imageUrl: string;
      
      if (this.imageUploadUrl) {
        imageUrl = await this.uploadImageToServer(file);
      } else {
        imageUrl = await this.convertToBase64(file);
      }
      
      this.insertImageIntoEditor(imageUrl, file.name);
      this.imageUpload.emit({ file, url: imageUrl });
      
    } catch (error) {
      console.error('Error uploading image:', error);
      this.showWarningMessage('Failed to upload image. Please try again.');
    } finally {
      this.isUploadingImage = false;
      this.uploadProgress = 0;
      this.cdRef.detectChanges();
    }
  }

  private async uploadImageToServer(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.imageUploadUrl) {
        reject(new Error('Image upload URL not provided'));
        return;
      }

      const formData = new FormData();
      formData.append('image', file);
      
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          this.uploadProgress = Math.round((event.loaded / event.total) * 100);
          this.cdRef.detectChanges();
        }
      });
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response.url || response.imageUrl || response.data?.url);
            } catch (error) {
              reject(new Error('Invalid server response'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error'));
      
      xhr.open('POST', this.imageUploadUrl);
      xhr.send(formData);
    });
  }

  private convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }

  private insertImageIntoEditor(imageUrl: string, altText: string = ''): void {
    if (!this.editorInstance || !this.iframeBody) return;
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.alt = altText;
    img.title = altText;
    
    const selection = this.iframeBody.ownerDocument.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      
      const textNode = this.iframeBody.ownerDocument.createTextNode(' ');
      range.insertNode(textNode);
      
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      this.iframeBody.appendChild(img);
      this.iframeBody.appendChild(document.createTextNode(' '));
    }
    
    this.updateValueFromIframe();
    this.iframeBody.focus();
  }

  private showWarningMessage(message: string): void {
    this.warningMessage = message;
    this.showPasteWarning = true;
    this.cdRef.detectChanges();
    
    setTimeout(() => {
      this.showPasteWarning = false;
      this.cdRef.detectChanges();
    }, 3000);
  }

  private cleanHtml(html: string): string {
    if (!html) return '';
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const cleanNode = (node: Node): Node | null => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.cloneNode(true);
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        
        const allowedTags = [
          'p', 'div', 'span', 'br',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'b', 'strong', 'i', 'em', 'u', 's', 'strike',
          'sub', 'sup',
          'ul', 'ol', 'li',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'a', 'img'
        ];
        
        if (!allowedTags.includes(tagName)) {
          const fragment = document.createDocumentFragment();
          Array.from(element.childNodes).forEach(child => {
            const cleaned = cleanNode(child);
            if (cleaned) {
              fragment.appendChild(cleaned);
            }
          });
          return fragment;
        }
        
        const newElement = document.createElement(tagName);
        
        if (element.attributes) {
          Array.from(element.attributes).forEach(attr => {
            const safeAttributes = [
              'src', 'alt', 'title', 'href', 'target',
              'style', 'class', 'id',
              'width', 'height', 'border',
              'colspan', 'rowspan',
              'align', 'valign'
            ];
            
            if (attr.name === 'style') {
              const allowedStyles = ['width', 'height', 'max-width', 'border', 'margin', 'padding', 'float', 'text-align', 'color', 'background-color', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-decoration', 'line-height'];
              const styles = attr.value.split(';').filter(style => {
                const [property] = style.split(':');
                return allowedStyles.includes(property.trim());
              });
              if (styles.length > 0) {
                newElement.setAttribute('style', styles.join(';'));
              }
            } else if (attr.name === 'src' && tagName === 'img') {
              const src = attr.value;
              if (src.startsWith('data:image/') || src.startsWith('http://') || src.startsWith('https://')) {
                const safeUrl = this.sanitizer.sanitize(1, src);
                if (safeUrl) {
                  newElement.setAttribute('src', safeUrl);
                }
              }
            } else if (safeAttributes.includes(attr.name)) {
              newElement.setAttribute(attr.name, attr.value);
            }
          });
        }
        
        Array.from(element.childNodes).forEach(child => {
          const cleaned = cleanNode(child);
          if (cleaned) {
            newElement.appendChild(cleaned);
          }
        });
        
        return newElement;
      }
      
      return null;
    };
    
    const cleanedFragment = document.createDocumentFragment();
    Array.from(doc.body.childNodes).forEach(child => {
      const cleaned = cleanNode(child);
      if (cleaned) {
        cleanedFragment.appendChild(cleaned);
      }
    });
    
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(cleanedFragment);
    
    return tempDiv.innerHTML;
  }

  // Fallback editor methods
  formatText(command: string, value?: string): void {
    if (this.showFallback && this.fallbackContentRef) {
      const editor = this.fallbackContentRef.nativeElement;
      editor.focus();
      document.execCommand(command, false, value);
      
      setTimeout(() => {
        this.onFallbackChange(editor.innerHTML);
      }, 0);
    }
  }

  handleFallbackInput(): void {
    if (this.fallbackContentRef) {
      this.onFallbackChange(this.fallbackContentRef.nativeElement.innerHTML);
    }
  }

  onFallbackChange(value: string): void {
    const cleanValue = this.cleanHtml(value);
    this.value = cleanValue;
    this.onChange(this.value);
    this.contentChange.emit(this.value);
  }

  insertFallbackImage(): void {
    if (this.imageInputRef) {
      this.imageInputRef.nativeElement.click();
    }
  }

  handleFallbackImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleImageUpload(input.files[0]);
      input.value = '';
    }
  }

  handleFallbackPaste(event: ClipboardEvent): void {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;
    
    // Check for any files in clipboard (images, documents, etc.)
    const hasFiles = Array.from(clipboardData.items).some(item => 
      item.kind === 'file' || 
      item.type.startsWith('image/') ||
      item.type.startsWith('application/') // documents
    );
    
    // Only block pasting if disableImagePaste is true AND clipboard contains files
    if (this.disableImagePaste && hasFiles) {
      event.preventDefault();
      event.stopPropagation();
      
      this.showPasteWarningMessage();
      return;
    }
    
    // Allow text/HTML paste to continue normally
    setTimeout(() => {
      this.handleFallbackInput();
    }, 0);
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    
    if (this.editorInstance) {
      try {
        const jq = (window as any).$;
        if (jq && this.editorRef?.nativeElement) {
          const el = jq(this.editorRef.nativeElement);
          if (el.data('cleditor')) {
            const editor = el.data('cleditor');
            if (editor.disable) {
              editor.disable(true);
            }
            el.removeData('cleditor');
          }
        }
      } catch (error) {
        console.warn('Error destroying CLEditor:', error);
      }
    }
  }
}
