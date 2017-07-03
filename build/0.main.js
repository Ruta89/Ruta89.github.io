webpackJsonp([0],{

/***/ 301:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ModalPageModule", function() { return ModalPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(54);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__modal__ = __webpack_require__(302);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};



var ModalPageModule = (function () {
    function ModalPageModule() {
    }
    return ModalPageModule;
}());
ModalPageModule = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["a" /* NgModule */])({
        declarations: [
            __WEBPACK_IMPORTED_MODULE_2__modal__["a" /* ModalPage */],
        ],
        imports: [
            __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["d" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_2__modal__["a" /* ModalPage */]),
        ],
        exports: [
            __WEBPACK_IMPORTED_MODULE_2__modal__["a" /* ModalPage */]
        ]
    })
], ModalPageModule);

//# sourceMappingURL=modal.module.js.map

/***/ }),

/***/ 302:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ModalPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_angularfire2_database__ = __webpack_require__(108);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_ionic_angular__ = __webpack_require__(54);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__angular_forms__ = __webpack_require__(15);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};




var ModalPage = (function () {
    function ModalPage(navCtrl, navParams, fb, afDb, viewCtrl) {
        this.navCtrl = navCtrl;
        this.navParams = navParams;
        this.fb = fb;
        this.afDb = afDb;
        this.viewCtrl = viewCtrl;
        this.itemTitle = '';
        this.itemSummary = '';
        this.itemId = '';
        this.isEditabled = false;
        this.itemRating = '';
        this.itemTodo = [];
        this.itemDone = [];
        this.form = fb.group({
            'title': ['', __WEBPACK_IMPORTED_MODULE_3__angular_forms__["e" /* Validators */].minLength(2)],
            'summary': ['', __WEBPACK_IMPORTED_MODULE_3__angular_forms__["e" /* Validators */].required],
            'rating': ['', __WEBPACK_IMPORTED_MODULE_3__angular_forms__["e" /* Validators */].required],
            'todo': [''],
            'done': ['']
        });
        this.items = this.afDb.list('/items');
        if (navParams.get('isEditabled')) {
            var item = navParams.get('item'), k = void 0;
            this.itemTitle = item.title;
            this.itemSummary = item.summary;
            this.itemDate = item.date;
            this.itemRating = item.rating;
            this.itemId = item.$key;
            for (k in item.todo) {
                this.itemTodo.push(item.todo[k].name);
            }
            for (k in item.done) {
                this.itemDone.push(item.done[k].name);
            }
            this.isEditabled = true;
        }
    }
    ModalPage.prototype.ionViewDidLoad = function () {
        console.log('ionViewDidLoad ModalPage');
    };
    ModalPage.prototype.saveItem = function (val) {
        var title = this.form.controls["title"].value, summary = this.form.controls["summary"].value, rating = this.form.controls["rating"].value, todo = this.form.controls["todo"].value, done = this.form.controls["done"].value, todoArray = [], doneArray = [], date = Date.now(), k;
        for (k in todo) {
            todoArray.push({
                "name": todo[k]
            });
        }
        for (k in done) {
            doneArray.push({
                "name": done[k]
            });
        }
        if (this.isEditabled) {
            this.items.update(this.itemId, {
                title: title,
                summary: summary,
                upDate: date,
                rating: rating,
                todo: todoArray,
                done: doneArray
            });
            console.log(' if (this.isEditabled) update( ');
        }
        else {
            this.items.push({
                title: title,
                date: date,
                summary: summary,
                rating: rating,
                todo: todoArray,
                done: doneArray
            });
            console.log(' else push( ');
        }
        this.closeModal();
    };
    ModalPage.prototype.closeModal = function () {
        this.viewCtrl.dismiss();
    };
    return ModalPage;
}());
ModalPage = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_ionic_angular__["e" /* IonicPage */])(),
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__angular_core__["_6" /* Component */])({
        selector: 'page-modal',template:/*ion-inline-start:"C:\dev\dziennik\src\pages\modal\modal.html"*/'<ion-header>\n  <ion-toolbar color="color2">\n    <ion-title>\n     Tytul: {{ itemTitle }}\n    </ion-title>\n    <ion-buttons start>\n      <button ion-button color="color2" (click)="closeModal()">\n        <ion-icon name="close"></ion-icon>\n      </button>\n    </ion-buttons>\n  </ion-toolbar>\n</ion-header>\n\n\n<ion-content>\n\n  <form [formGroup]="form" (ngSubmit)="saveItem(form.value)">\n\n    <ion-item-divider color="light">\n      <div *ngIf="!isEditabled">\n        Dodaj nowa pozycje\n      </div>\n      <div *ngIf="isEditabled">\n        Modyfikuj pozycje\n      </div>\n    </ion-item-divider>\n\n    <ion-item>\n      <ion-label stacked>Tutul</ion-label>\n      <ion-input type="text" formControlName="title" [(ngModel)]="itemTitle"></ion-input>\n    </ion-item>\n\n    <ion-item>\n      <ion-label stacked>Podsumowanie</ion-label>\n      <ion-input type="text" formControlName="summary" [(ngModel)]="itemSummary"></ion-input>\n    </ion-item>\n\n    <ion-item>\n      <ion-label stacked>Ocena</ion-label>\n      <ion-input type="text" formControlName="rating" [(ngModel)]="itemRating"></ion-input>\n    </ion-item>\n\n        <ion-item>\n      <ion-label stacked>zrobic:</ion-label>\n      <ion-select formControlName="todo" multiple="true" [(ngModel)]="itemTodo">\n        <ion-option value="Action">Action</ion-option>\n        <ion-option value="Comedy">Comedy</ion-option>\n        <ion-option value="Document">Document</ion-option>\n        <ion-option value="Historical">Historical</ion-option>\n        <ion-option value="Romance">Romance</ion-option>\n        <ion-option value="Science Fiction">Science Fiction</ion-option>\n        <ion-option value="Thriller">Thriller</ion-option>\n        <ion-option value="Zombie">Zombie</ion-option>\n        <ion-option value="War">War</ion-option>\n      </ion-select>\n    </ion-item>\n\n           <ion-item>\n      <ion-label stacked>Zrobilem:</ion-label>\n      <ion-select formControlName="done" multiple="true" [(ngModel)]="itemDone">\n        <ion-option value="aaa">aaa</ion-option>\n        <ion-option value="bbb">bbb</ion-option>\n        <ion-option value="Document">Document</ion-option>\n        <ion-option value="Historical">Historical</ion-option>\n        <ion-option value="Romance">Romance</ion-option>\n        <ion-option value="Science Fiction">Science Fiction</ion-option>\n        <ion-option value="Thriller">Thriller</ion-option>\n        <ion-option value="Zombie">Zombie</ion-option>\n        <ion-option value="War">War</ion-option>\n      </ion-select>\n    </ion-item>\n\n    <ion-item>\n      <input type="hidden" name="itemId">\n\n        <button ion-button block color="color2" text-center padding-top padding-bottom [disabled]="!form.valid">\n          <div *ngIf="!isEditabled">\n            Dodaj nowa pozycje\n          </div>\n\n            <div *ngIf="isEditabled">\n              Aktualizuj pozycje\n            </div>\n        </button>\n    </ion-item>\n\n  </form>\n\n</ion-content>\n'/*ion-inline-end:"C:\dev\dziennik\src\pages\modal\modal.html"*/,
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof __WEBPACK_IMPORTED_MODULE_2_ionic_angular__["f" /* NavController */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_2_ionic_angular__["f" /* NavController */]) === "function" && _a || Object, typeof (_b = typeof __WEBPACK_IMPORTED_MODULE_2_ionic_angular__["g" /* NavParams */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_2_ionic_angular__["g" /* NavParams */]) === "function" && _b || Object, typeof (_c = typeof __WEBPACK_IMPORTED_MODULE_3__angular_forms__["f" /* FormBuilder */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_3__angular_forms__["f" /* FormBuilder */]) === "function" && _c || Object, typeof (_d = typeof __WEBPACK_IMPORTED_MODULE_0_angularfire2_database__["b" /* AngularFireDatabase */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_0_angularfire2_database__["b" /* AngularFireDatabase */]) === "function" && _d || Object, typeof (_e = typeof __WEBPACK_IMPORTED_MODULE_2_ionic_angular__["h" /* ViewController */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_2_ionic_angular__["h" /* ViewController */]) === "function" && _e || Object])
], ModalPage);

var _a, _b, _c, _d, _e;
//# sourceMappingURL=modal.js.map

/***/ })

});
//# sourceMappingURL=0.main.js.map