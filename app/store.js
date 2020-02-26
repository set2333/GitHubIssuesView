import { createStore } from 'redux';

const cache = new Map();//Кэш. Если мы один раз загрузили список репозиториев, то для ускорения работы и для экономии лимитов на запросы к GitHab, закэшируем данные по пользователю.

const initialState = {//Начальное состояние хранилища
  userName:'',
  repoName:'',
  repoList:[],
  issueList:[],
  currentIssue:null,
  loadingIndicator:false,
  massage:''
}

function reducer(state=initialState, action) {
  switch(action.type){
    case 'SET_ISSUE_LIST':
      return {...state, issueList:action.list};  
    case 'ON_CHANGE_USER_NAME':
      return {...state, userName:action.value, repoList:[], repoName:'', issueList:[]};
    case 'ON_CHANGE_REPO_NAME':
      state.repoName = action.value;
    case 'SET_REPO_LIST':
      return (action.list.length)?{...state, issueList:[], repoList:action.list.filter((item)=>item.name.toLowerCase().includes(state.repoName.toLowerCase()))}:{...state};
    case 'CLEAR_REPO_LIST':
      return {...state, repoList:[]};
    case 'SET_CURRENT_ISSUE':
      return {...state, currentIssue:action.value};
    case 'SET_LOADING_INDICATOR':
      return {...state, loadingIndicator:action.value};
    case 'SET_MESSAGE':
      return {...state, message:action.value};  
  }
  return state;
}

const store = createStore(reducer);

export { store, cache };