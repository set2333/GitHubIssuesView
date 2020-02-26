import { store, cache } from './store.js';

const sicretKey = 'c2V0MjMzMzo1YTRmNmZkOTcyNjlmM2IzODk3OThjYWU3OWYwMjE1MmJhNjllOWIw';//Для неавторизованного пользователя GitHub позволяет делать только 60 запросов в час, а для авторизованных 5000 запросов. Если не авторизоватся (sicretKey = null), при привышении лимита GitHub возвращает ошибку 403. Ключ личный, просьба не тырить:-)

function getGitHubData(query, mask, cb) {//Получение данных с GitHub. Остальные функции получающие данные работают через эту функцию
  let xhr = new XMLHttpRequest();
  xhr.open('GET', query);
  if (sicretKey)
    xhr.setRequestHeader('Authorization', 'Basic '+sicretKey); 
  xhr.onload = ()=>{
    let data = [];//Массив с результатами.
    if(xhr.status=='200') {
      try {
        let jsonData = JSON.parse(xhr.response);
        if(!Array.isArray(jsonData))//jsonData бывает массив, а бывает и нет. Если нет приведу к массиву, для последующего однообразия обработки
          jsonData = [jsonData];
        data = jsonData.map((item)=>{//Обработаем каждый объект из массива ответов и вернем массив с полученными объектами
          return mask.reduce((prev, key)=>{//Вернем объект только с нужными нам свойствами
            let indexObjProp = key.indexOf('.');
            if(~indexObjProp) {//Если в маске есть позиции с точкой, то это вложенные объекты.
              let obj = key.slice(0, indexObjProp);//Название подобъекта
              let prop = key.slice(indexObjProp+1);//Свойство подобъекта
              if(!prev[obj])
                prev[obj] = {};
              prev[obj][prop] = (!item[obj][prop])?null:item[obj][prop];
            }
            else
              prev[key] = (!item[key])?null:item[key];//Если в ответе нет нужного свойства установим свойство в null
            return prev;
          }, {});
        });
      }
      catch {
        store.dispatch({type:'SET_LOADING_INDICATOR', value:false});
        store.dispatch({ type:'SET_MESSAGE', value:'Ошибка получения данных.'});
      }
    }
    cb(data, xhr.status);//Вызовем колбек с получившимся массивом объектов и статусом ответа
  };
  xhr.send();
}

function getGihHubRepos(userName, page, size) {//Получим с GitHub список репозиториев пользователя
  let mask = ['name', 'id', 'full_name'];
  const cb = (data, status)=>{
    if(cache.has(userName))
      cache.set(userName, cache.get(userName).concat(data));
    else
      cache.set(userName, data);
    let list = cache.get(userName);
    if(list.length == size){
      store.dispatch({type:'SET_LOADING_INDICATOR', value:false});
      if(!store.getState().repoName)
        store.dispatch({ type:'SET_REPO_LIST', list:list});
    }  
  }
  getGitHubData('https://api.github.com/users/'+userName+'/repos?per_page=100&page='+page, mask, cb);
}

function getGitHubUser(userName) {//Получим количество репозиториев пользователя
  store.dispatch({type:'SET_LOADING_INDICATOR', value:true});
  let mask = ['login', 'public_repos'];
  const cb = (data, status) =>{
    if(status!==200 || data[0].public_repos == null){
      store.dispatch({type:'SET_LOADING_INDICATOR', value:false});
      return store.dispatch({ type:'SET_MESSAGE', value:'Ошибка получения пользователя.'});
    }  
    for(let i=1; i<Math.ceil(data[0].public_repos/100)+1;i++) 
      getGihHubRepos(userName, i, data[0].public_repos);
  }
  getGitHubData('https://api.github.com/users/'+userName, mask, cb);  
}

function getGitHubIssueList(repoName, repoPath) {//Получим список обращений
  store.dispatch({ type:'ON_CHANGE_REPO_NAME', value:repoName, list:[]});
  store.dispatch({ type:'CLEAR_REPO_LIST'});
  let mask = ['number', 'title', 'created_at', 'url'];
  getGitHubData('https://api.github.com/repos/'+repoPath+'/issues', mask, (data, status)=>{
    if(status!==200)
      return store.dispatch({ type:'SET_MESSAGE', value:'Ошибка получения списка обращений.'});
    store.dispatch({ type:'SET_ISSUE_LIST', list:data});
  });
}

function getGitHubIssueOne(issueUrl) {//Получим детальную информацию по одному issues с GitHub
  let mask = ['number', 'title', 'created_at', 'body', 'state', 'updated_at', 'user.login', 'user.html_url', 'user.avatar_url'];
  getGitHubData(issueUrl, mask, (data, status)=>{
    if(status!==200)
      return store.dispatch({ type:'SET_MESSAGE', value:'Ошибка загрузки issue.'});
    store.dispatch({type:'SET_CURRENT_ISSUE', value:data[0]});
  });
}

export { getGihHubRepos, getGitHubUser, getGitHubIssueList, getGitHubIssueOne }