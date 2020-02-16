const React = require('react');
const ReactDOM = require('react-dom');

function niceDate(date) {
    return new Date(date).toLocaleDateString('ru');
}

function getDataGitHub(query, mask, cb) {//Получение данных с GitHub. query - строка запроса, mask - массив с названиями свойств. Т.к. мы получаем ответ в виде объекта у которого очень много свойств, мы скопируем только нужные нам свойства из этого ответа, cb - функция обратного вызова. В ней мы можем устанавливать наши состояния.
    let xhr = new XMLHttpRequest();
        xhr.open('GET', query);
        xhr.onload = ()=>{
            console.dir(xhr)
            if(xhr.status=='200') {
                let jsonData = JSON.parse(xhr.response);
                if(!Array.isArray(jsonData))
                    jsonData = [jsonData];
                let data = jsonData.map((item)=>{//Обработаем каждый объект из массива ответов и вернем массив с полученными объектами
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
                cb(data);//Вызовем колбек с получившимся массивом объектов
            }
        };
        xhr.send();
}

function RepoList(props) {//Список репозиториев для дополнения строки поиска
    return(
        <ul className={(props.children.length)? 'repoList':'hidenBlock'}>
            {props.children.map((item)=>{
                if(item.visibility)//в слачае фильтрации покажем только нужные issues
                    return(<li onClick={props.handleClick.bind(this, item.full_name)} key={item.id}>{item.name}</li>);
                return null;
            })}
        </ul>
    );
}

function SearchString(props) {//Строка поиска с кнопкой
    const [searchString, setSearchString] = React.useState('');
    const [repoList, setrepoList] = React.useState([]);
    
    addRepoName = function(name) {//Дополним строку поиска выбранным в списке репозиторием и поищем issues по нему
        setrepoList([]);//Мы уже выбрали репозиторий, по этому список доступных репозиториев можно очистить
        setSearchString(name);
        props.handleClick(name);
    }
    
    getRepoGitHub = function() {//Получим с GitHub список репозиториев пользователя
        let mask = ['name', 'id', 'full_name'];
        getDataGitHub('https://api.github.com/users/'+searchString+'/repos?page=200', mask, (result)=>{
            setrepoList(result.map((i)=>{
                i.visibility=true; 
                return i;
            }));
        });//По поводу колбека. К получившимся объектам добавим поле visibility. Нужно для последующей фильтрации списка репозиториев в сторке поиска
    }
    
    onChange = function(e) {//Вводим текст в стороку поиска с клавиатуры
        let val = e.target.value;
        let indRepo = val.indexOf('/'); //индекс символа /
        setSearchString(val);
        if(val[val.length-1] == '/') {//Если введен символ /, значит имя пользователя введено. Поищим его репозитории
            getRepoGitHub();
        }
        if(!~indRepo) {//Если в строке нет символа / список репозиториев не нужен. Уберем его
            setrepoList([]);
        }
        else {//Введены какие-то символы после /. Отфильтруем список репозиториев
            setrepoList(repoList.map((i)=>{
                let repoName = val.slice(indRepo+1).toLowerCase();//имя репозитория. Поиск будем производить без учета регистра
                i.visibility = ~i.name.toLowerCase().indexOf(repoName);
                return i;
            }));
        }
    }
    return(
        <div className='SearchString'>
            <input onChange={onChange} value={searchString}></input>
            <button onClick={()=>{setrepoList([]); props.handleClick.call(this, searchString)}}>Поиск</button>
            <RepoList handleClick={addRepoName}>{repoList}</RepoList>
        </div>
    );
}

function ListIssues(props) {//Список Issues
    return(
        <ul className='listIssues'>
            {props.issues.map((i)=>{
                 return <li onClick={props.handleClick.bind(this, i.url)} key={i.number}><h2>№{i.number} от {niceDate(i.created_at)}</h2><p>{i.title}</p></li>;
             })}
        </ul>
    );
}

function IssuePage(props) {//Страница с детальной информацией
    if(props.issue === null)
        return(
            <p>Введите название репозитория в поле поиска в формате: <b>Имя_пользователя/Название_репозитория</b></p>
        );
    return(
        <React.Fragment>
          <div>
              <div className='issueInfo'>
                  <p><img className='avatarImg' src={props.issue.user.avatar_url} alt={props.issue.user.login}/> <a href={props.issue.user.html_url}>{props.issue.user.login}</a></p>
                  <p>№:{props.issue.number}</p>
                  <p>Статус: {props.issue.state}</p>
                  <p>Созданно: {niceDate(props.issue.created_at)}</p>
                  <p>Обновленно: {niceDate(props.issue.updated_at)}</p>
              </div>
                  <h1>{props.issue.title}</h1>
                  <p>{props.issue.body}</p>
          </div>
        </React.Fragment>
    );
}

class App extends React.Component {//Главный компонент. Точка входа
    constructor(props) {
        super(props);
        this.state = {
            issues:[],
            currentIssue:null
        };
        this.getIssuesGitHub = this.getIssuesGitHub.bind(this);
        this.getOneIssueGitHub = this.getOneIssueGitHub.bind(this);
    }
    
    getIssuesGitHub(data) {//Получение данных с GitHub со списком Issues
        let mask = ['number', 'title', 'created_at', 'url'];
        getDataGitHub('https://api.github.com/repos/'+data+'/issues', mask, (result)=>{this.setState({issues:result})});
    }
    
    getOneIssueGitHub(data) {//Получим детальную информацию по одному issues с GitHub
        let mask = ['number', 'title', 'created_at', 'body', 'state', 'updated_at', 'user.login', 'user.html_url', 'user.avatar_url'];
        getDataGitHub(data, mask, (result)=>{this.setState({currentIssue:result[0]})});
    }
    
    render() {
        return(
            <React.Fragment>
                <div className='blockSearch'>
                    <SearchString handleClick={this.getIssuesGitHub}/>
                    <ListIssues handleClick={this.getOneIssueGitHub} issues={this.state.issues} />
                </div>
                <div className='blockIssue'>
                    <IssuePage issue={this.state.currentIssue}/>
                </div>
            </React.Fragment>
            
        );
    }
} 

ReactDOM.render(
  <App />,
  document.getElementById('main')
);