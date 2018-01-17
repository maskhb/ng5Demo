/**
 * Created By Remiel.
 * Date: 16/4/15
 * Time: 下午6:04
 */
import immutable from "immutable";
import EventEmitter from "events";
import _ from "lodash";
import dispatcher from "helpers/dispatcher";
import {BaseStore,createAutoEmitStoreClass} from "helpers/storeClass";
import {Modal,message} from "antd"
import {
  queryGoods as goodsQuery,
  add as addGoods,
  edit as editGoods,
  getGoodsDetail as getGoods,
  updateGoodsFlow,
  updateGoodsSellingLabel,
  findGoodsStock,
  updateGoodsStock,
  isAuction,
  isInActivities,

  findGoodsCategoryProperty,
  updateCategoryProperty,
  addCategoryProperty,
  existGoodsCategoryPropertyName,

  findCategoryDeliveryList,
  deleteCategoryDeliveryForPlatform,
  saveCategoryDeliveryForPlatform
}
   from "models/goods";


import {
  queryCategoryList as categoryQuery,
  add as addCategory,
  edit as editCategory,
  get as getCategory
} from "models/goods-category";
import { goTo } from "actions/route"
import {showConfirm,showAlert} from "actions/modal";

import { updateRebateRatio, briefSkus,findGoodsDetailForPlatform} from "./resource";
class Store extends BaseStore{
  constructor(){
    super();

    this._data = immutable.fromJS({
      list: [],
      pager : {
        current: 1,
        pageSize: 10,
        total : 0,
        onChange:()=>{
          console.log('pageChange....')
        }
      },
      search : {
        goodsId : "",
        goodsName : "",
        goodsStatus: "",
        categoryId: "",
        sellingTime: "",
        createTime: "",
        supplierName: ""
      },
      stockModal: {
        state: false,
        skuId: 0
      },
      stockForm: {
        list: []
      },

      goodsReview: {
        id: 0,
        show: false,
        status: 51,
        unpassReason: ''
      },
      _defaultGoodsReview:{
        id: 0,
        show: false,
        status: 51,
        unpassReason: ''
      },

      goodsSellingLabel:{
        show: false,
        skuId: 0,
        sellingLabel: 0,
        index: 0
      },
      _defaultGoodsSellingLabel:{
        skuId: 0,
        sellingLabel: 0,
        index: 0
      },


      // 分类
      category: {
        list: [],
        pager : {
          current: 1,
          pageSize: 999,
          total : 0
        },
        form:{

        },
        _defaultForm:{
          parentCategoryId: 0,
          name: '',
          description: '',
          pictureUrl: '',
          status: 0
        }

      },
      categoryFormModalStatus: false,
      categoryDetailModalStatus: false,



      //类目属性管理
      categoryProperty: {
        list: [],
        pager: {
          current: 1,
          pageSize: 20,
          total : 0
        },
        form: {},
        formModalStatus: false,
        detailModalStatus: false,
      },

      //生鲜配送管理
      delivery:{
        list:[],
        form:{
          modalShow:false,
        },
      },
      // 返点设置
      rebateModal: {
        dataSource:{

        },
        form: {
          visible: false
        }
      },
      rebateForm:{
        'rebateRatio':'0'
      }
    });

    this._defaultForm = immutable.fromJS({
      goodsBase: {
        categoryId: -1,
        goodsName: '',//
        goodsSummary: '',
        unit: '',//
        barcode: '',
        specification: '',//
        originPrice: '',
        sellingPrice: '',//
        startSellingTime: 0,
      },
      // goodsShips: [{
      //   shipType: 1, //
      // }],
      goodsStocks: [
        // {
        //   communityId: 0,
        //   actualStock: 1,
        //   community: []
        // }
      ],
      goodsImgs: [
      ],
      goodsNewImgs: [],
      goodsImgMainIndex: 0,
      goodsDetail: {
        detailContent: '',
        buyNote: ''
      }
    });

    //类目属性管理  属性默认值
    /**
     * 属性名称：propertyName
     * 基本属性：propertyType
     * 字符限制：limitSize
     * 是否必填：isRequired
     * 其他提示：remark
     * 属性状态: propertyStatus ：0-关闭，1-开放
     */
    this._defaultCategoryPropertyForm = immutable.fromJS({
      propertyName: '',
      propertyType: '',
      limitSize: '',
      isRequired: '',
      remark: '',
      propertyStatus: 1,
      categoryId: ''
    });

  }
}



export default new (createAutoEmitStoreClass(Store,{

  /**
   * 初始化列表
   * @param routeParams 路由信息
   */
  initList({params}){



    if(params.currentPage){
      this._data = this._data.setIn(['pager','current'], immutable.fromJS(params.currentPage))
    }
    return this.query();
  },
  queryByRoutePager(current){
    current = current || 1;
    return this.query({},{current})
  },
  query(search,pager) {
    search = _.extend(this._data.get('search').toJS(), search);
    pager = _.extend(this._data.get('pager').toJS(),pager);
    // this._data = this._data.set('search', search);
    //1 只输出默认sku
    search.isDefault = 1;
    return goodsQuery({
      search : search,
      pager : pager
    }).then(function(data){
      let iList = immutable.fromJS(data.list);
      iList = iList.map((item, i)=>  {
        let iGoodsBase = item.get("goodsBase");
        item = item.set("goodsBase", this.transformGoodsBaseFromModel(iGoodsBase));
        return item;
      });
      this._data = this._data.set('search',immutable.fromJS(search))
        .set("list", iList)
        .mergeIn(["pager"],data['pager']);

    }.bind(this));
  },
  getGoods({params}){
    getGoods({skuId: params.id})
  },

  initForm({params}){
    debugger;
    console.log('params', params);
    //编辑
    var that = this;
    if(params['id']){
      return getGoods({goodsId : params['id']}).then((data)=>{
        let iForm = immutable.fromJS(data);
        let iGoodsBase = iForm.get("goodsBase");
        iForm = iForm.set('goodsBase', this.transformGoodsBaseFromModel(iGoodsBase));
        that._data = that._data.set("form", iForm);
      });
    }else{
      this._data = this._data.set("form",this._defaultForm);
    }
  },
  // 转换goodsBase 从表单数据转换到后端格式
  transformGoodsBase(iGoodsBase){
    let startSellingTime = iGoodsBase.get('startSellingTime');
    console.log('save', startSellingTime);
    if(startSellingTime){
      iGoodsBase = iGoodsBase.set('startSellingTime', new Date(startSellingTime).getTime())
    }else{
      iGoodsBase = iGoodsBase.delete('startSellingTime')
    }

    iGoodsBase = iGoodsBase
      .set('originPrice', iGoodsBase.get('originPrice') * 100)
      .set('sellingPrice', iGoodsBase.get('sellingPrice') * 100);
    return iGoodsBase
  },
  // 转换goodsBase 从后端返回数据转换
  transformGoodsBaseFromModel(iGoodsBase){
    let startSellingTime = iGoodsBase.get('startSellingTime');
    // console.log('save', startSellingTime);
    if(startSellingTime){
      iGoodsBase = iGoodsBase.set('startSellingTime', new Date(startSellingTime))
    }
    iGoodsBase = iGoodsBase
      .set('originPrice', (iGoodsBase.get('originPrice') / 100).toFixed(2))
      .set('sellingPrice', (iGoodsBase.get('sellingPrice') / 100).toFixed(2));
      // .set('limitStock', iGoodsBase.get('limitStock') ? iGoodsBase.get('limitStock') : '' );
    return iGoodsBase
  },
  save(goodsStatus=1){
    let iForm = this._data.get("form");
    let iGoodsBase = iForm.get("goodsBase");
    let iGoodsStocks = iForm.get("goodsStocks");
    iGoodsBase = iGoodsBase.set('goodsStatus', goodsStatus);
    iGoodsStocks = iGoodsStocks.map((item, i)=>{
      return item.set('communityId', item.getIn(['community', 1]))
    });
    iForm = iForm
      .set('goodsBase', this.transformGoodsBase(iGoodsBase))
      .set('goodsStocks', iGoodsStocks);
    console.log('----save-----', this._data.get("form").toJS());
    if(iForm.getIn(['goodsBase','skuId'])){
      return editGoods(iForm.toJS());
    }else{
      return addGoods(iForm.toJS());
    }
  },

  //updateGoodsFlow
  updateGoodsFlow(params,type){
    let {flowId} =  params;
    if(flowId == 52){
      let { unpassReason } = params;
      if(unpassReason.length >50){
        Modal.info({
          title:'提示',
          content:'最多50个字'
        });
        return false;
      }
    }

    return updateGoodsFlow(params).then(()=>{
      if(type&&type=='detail'){
        return this.initForm({params:{id:params.goodsId}})
      }else{
        return this.query(this._data.get('search').toJS(),this._data.get('pager').toJS())
      }

    });
  },


  //category

  queryCategory(search,pager) {
    pager = _.extend(this._data.getIn(['category','pager']).toJS(),{current : 1},pager);
    return categoryQuery({
      // depth: 0, //类目深度 0 所有类目 1 1级类目 2 2级类目
      pager : pager
    }).then(function(data){
      this._data = this._data.setIn(["category","list"],immutable.fromJS(data['list'])).
                              mergeIn(["category","pager"],data['pager']);
    }.bind(this));
  },
  setCategoryForm(category){
    console.log({category:category})
    if(category){
      this._data = this._data.setIn(['category', 'form'], immutable.fromJS(category));
    }else{
      this._data = this._data.setIn(['category', 'form'], this._data.getIn(['category', '_defaultForm']));
    }
  },
  saveCategory(){
    //let iForm = this._data.getIn(['category', 'form']);
    let iForm = this.getData('category.form');
    iForm = iForm.set('status', iForm.get('status') ? 1 : 0);


    if(iForm.get('categoryId') > 0){
      this.toggle('categoryFormModalStatus');
      return editCategory(iForm.toJS()).then((res)=>{
        return this.queryCategory();
      });
    }else{
      this.toggle('categoryFormModalStatus');
      return addCategory(iForm.toJS()).then(()=>{
        return this.queryCategory();
      });
    }
  },
  resetGoodsReview(id){
    this._data = this._data
      .set('goodsReview', this._data.get('_defaultGoodsReview').set('id', id));
  },
  updateGoodsSellingLabel(){
    let params = this._data.get('goodsSellingLabel').toJS();
    let index = params.index;
    delete params.show;
    delete params.index;
    this._data = this._data.setIn(['form', 'skus', index, 'goodsBase', 'sellingLabel'], params.sellingLabel);
    return updateGoodsSellingLabel(params)
  },
  resetGoodsSellingLabel(params){
    params = _.extend({
      skuId: 0,
      sellingLabel: 0,
      index: 0
    }, params);
    this._data = this._data
      .set('goodsSellingLabel', immutable.fromJS(params));
  },

  setStockModal(param){
    this._data = this._data.set('stockModal',immutable.fromJS(param));
  },

  setStockForm(){
    this._data = this._data.setIn(['stockForm', 'list'], []);
  },
  initGoodsStockForm(){
    return findGoodsStock({skuId: this._data.getIn(['stockModal', 'skuId'])}).then((data)=>{
      this._data = this._data.setIn(['stockForm', 'list'], data);
    });
  },
  updateGoodsStock(){
    let iForm = this._data.getIn(['stockForm', 'list']);
    this._data = this._data.setIn(['stockModal','state'], false);
    return Promise.all([
      updateGoodsStock({
        skuId: this._data.getIn(['stockModal', 'skuId']),
        goodsStocks: iForm.map((item)=>{
          return {
            communityId: item.get('community').get(1),
            actualStock: item.get('addActualStock')
          }
        })
      })
    ]);
  },

  setMainImgIndex(index){
    this._data = this._data.setIn(['form', 'goodsImgMainIndex'], index);
  },
  removeImg(index){
    this._data = this._data.setIn(['form', 'goodsNewImgs'], this._data.getIn(['form', 'goodsNewImgs']).splice(index, 1));
    if(this._data.getIn(['form', 'goodsNewImgs']).size >= this._data.getIn(['form', 'goodsImgMainIndex'])){
      this._data = this._data.setIn(['form', 'goodsImgMainIndex'], 0);
    }
    if(this._data.getIn(['form', 'goodsImgs']).size > index){
      this._data = this._data.setIn(['form', 'goodsImgs'], this._data.getIn(['form', 'goodsImgs']).splice(index, 1));
    }
  },

  //是否参加活动中
  isAuction(params){
    return isInActivities(params);
  },




  //类目属性管理
  categoryPropertyIdChange(id){
    if(id > 0){
      this._data = this._data.setIn(['categoryProperty', 'id'], id);
      return this.findGoodsCategoryProperty(id);
    }else {
      this.resetCategoryProperty();
    }
  },
  initCategoryProperty({params}){
    console.log('-----> init .',params);
    if(params.id > 0){
      const id = +params.id;
      this._data = this._data.setIn(['categoryProperty', 'id'], id);
      return this.findGoodsCategoryProperty(id);
    }else{
      this.resetCategoryProperty();
    }
  },
  findGoodsCategoryProperty(id, pager){
    pager = _.extend(this._data.getIn(['categoryProperty','pager']).toJS(),{current : 1},pager);
    return findGoodsCategoryProperty({
      condition: {
        categoryId: id,
      },
      pager: pager
    }).then((data)=>{
      this._data = this._data
        .setIn(['categoryProperty', 'list'], immutable.fromJS(data['list']))
        .setIn(['categoryProperty', 'pager'],immutable.fromJS(data['pager']));
    });
  },
  resetCategoryProperty(){
    this._data = this._data
      .setIn(['categoryProperty', 'id'], 0)
      .setIn(['categoryProperty', 'list'], immutable.fromJS([]))
      .setIn(['categoryProperty', 'pager'],immutable.fromJS({
        current: 1,
        pageSize: 20,
        total : 0
      }));
  },

  setCategoryPropertyForm(categoryProperty){
    if(categoryProperty){
      this._data = this._data.setIn(['categoryProperty', 'form'], immutable.fromJS(categoryProperty));
    }else{
      this._data = this._data.setIn(['categoryProperty', 'form'], this._defaultCategoryPropertyForm);
    }
  },

  saveCategoryProperty(){
    let iForm = this._data.getIn(['categoryProperty', 'form']);
    let id = this._data.getIn(['categoryProperty', 'id']);
    console.log(id, iForm.toJS());
    iForm = iForm.set('categoryId', id);
    this.toggle('categoryProperty.formModalStatus');
    if(iForm.get('modelPropertyId') > 0){
      return updateCategoryProperty(iForm.toJS()).then(()=>{
        return this.findGoodsCategoryProperty(id);
      });
    }else{
      return addCategoryProperty(iForm.toJS()).then(()=>{
        return this.findGoodsCategoryProperty(id);
      });
    }
  },

  existGoodsCategoryPropertyName(){
    let iForm = this._data.getIn(['categoryProperty', 'form']);
    let id = this._data.getIn(['categoryProperty', 'id']);
    let propertyName = iForm.get('propertyName');
    return existGoodsCategoryPropertyName({
      categoryId: id,
      propertyName: propertyName
    })
  },
  // queryCategory(search,pager) {
  //   pager = _.extend(this._data.getIn(['category','pager']).toJS(),{current : 1},pager);
  //   return categoryQuery({
  //     // depth: 0, //类目深度 0 所有类目 1 1级类目 2 2级类目
  //     pager : pager
  //   }).then(function(data){
  //     this._data = this._data.setIn(["category","list"],immutable.fromJS(data['list'])).
  //                             mergeIn(["category","pager"],data['pager']);
  //   }.bind(this));
  // },
  queryDelivery(){
    let that = this;
    return categoryQuery({
      depth: 0, //类目深度 0 所有类目 1 1级类目 2 2级类目
      pager : { current: 1,pageSize: 999,total : 0},
    }).then((data)=>{
      let _categoryId;
      _.map(data.list.toJS(),(obj)=>{
        let {type,categoryId} = obj;
        if(type==1){
          _categoryId =  categoryId;
        }
      })
      return findCategoryDeliveryList({categoryId:_categoryId}).then((res)=>{
        that._data = that._data.setIn(["delivery","list"],immutable.fromJS(res))
                  .setIn(["delivery","categoryId"],immutable.fromJS(_categoryId))
      });
    })

  },
  saveDelivery(formObj){
    let that = this;
    formObj['categoryId'] = that._data.getIn(['delivery','categoryId']);
    formObj.deliverys = _.map(formObj.deliverys,(obj,index)=>{
      let { communityId } = obj
      return {
        communityId:communityId[1],
        orderNum:index
      }
    })
    return saveCategoryDeliveryForPlatform(formObj).then(res=>{
      if(res){
        showAlert('保存成功。')
        that.closeFormModal();
        that.queryDelivery();
      }
    },()=>{});
  },
  delDelivery(deliveryId){
    let that = this;
    showConfirm('确认要删除该配送区域？','提示').then(flag=>{
      if(flag){
        return deleteCategoryDeliveryForPlatform({deliveryId}).then((result)=>{
          that.queryDelivery();
        })
      }
    })

  },
  openFormModal(){
    return this._data = this._data.setIn(['delivery','form'],immutable.fromJS({modalShow:true}));
  },
  closeFormModal(){
    return this._data = this._data.setIn(['delivery','form'],immutable.fromJS({modalShow:false}));
  },
  showRebateModal(goodsBase) {
    var _this = this;
    var modalData = [] ;
    var rebateRatio = goodsBase.rebateRatio;
    _this.setData("rebateForm.rebateRatio",rebateRatio)
    return briefSkus({ goodsId: Number(goodsBase.goodsId)}).then(function(res){
      console.log({goodsBase:JSON.stringify(goodsBase)})
      if(res.length==0){
        console.log('没有数据')
      }else{
        let resDataForFormatter = res;
        let rebateRatio = resDataForFormatter[0].rebateRatio;
        let tableData = [];
        resDataForFormatter.forEach(function(item){
          tableData.push({
            skuId:item.skuId,
            specification:item.specification,
            properties:item.properties,
            sellingPrice:(item.sellingPrice/100),
            rebateAmount:(item.rebateAmount/100)
          })
        })
        let TableInfo = {
          pubInfo:{
            goodsId:Number(goodsBase.goodsId),
            goodsName:goodsBase.goodsName,
            rebateRatio:rebateRatio,
          },
          tableData:tableData
        }
        _this._data = _this._data.setIn(['rebateModal', 'dataSource'], immutable.fromJS(TableInfo))
      }
      _this._data = _this._data.setIn(['rebateModal', 'form'], immutable.fromJS({ visible: true }));
      console.log({'pubData===':JSON.stringify(_this._data.getIn(['rebateModal','dataSource','pubInfo']))})
      console.log({'pubData===':JSON.stringify(_this._data.get('rebateModal'))})
      // console.log({'tableData===':JSON.stringify(_this._data.getIn(['rebateModal','tableData']))})
    },function(err){
      message.error(err)
    })

  },
  submitRebateForm(){
    let goodsId=this._data.getIn(['rebateModal','dataSource']).toJS()['pubInfo']['goodsId']
    updateRebateRatio({goodsId:goodsId,rebateRatio:Number(this._data.get('rebateForm').toJS()['rebateRatio'])}).then(function(res){
      if(res){
        console.log('成功')
      }
    },function(err){
      message.error(err)
    })
    this.query();
    this.closeRebateModal();
  },
  closeRebateModal() {
    return this._data = this._data.setIn(['rebateModal', 'form'], immutable.fromJS({ visible: false }));
  },
  calcRebateAmount(){
    console.log(Number(this._data.get('rebateForm').toJS()['rebateRatio']))
    let currentRebateRatios = Number(this._data.get('rebateForm').toJS()['rebateRatio'])
    if(isNaN(currentRebateRatios) || currentRebateRatios>100 || currentRebateRatios<0){
      return message.error("请输入0-100间的数字")
    }
    let self = this;
    let TempTableData = self._data.getIn(['rebateModal','dataSource']).toJS()['tableData'];
    TempTableData.forEach(function(item){
      item.rebateAmount = Math.round((currentRebateRatios/100*item.sellingPrice)*100)/100
    })
    self.setData('rebateModal.dataSource.tableData',TempTableData)
  },

  /* 查询商品上架状态 */
  checkStatus(id){
    findGoodsDetailForPlatform({
        param: JSON.stringify({
            "goodsId": '' + id
        })
    }).then(function(res){
      let status = res.goodsBase.goodsStatus;
      if(!(status==5||status==1||status==3)){
        Modal.info({
          title:'警告',
          content:'该商品状态已变更，您不可执行此操作'
        })
      }else{
        goTo(`/mall/goods/all/edit/${id}`)
      }
    })
  },
}))()
