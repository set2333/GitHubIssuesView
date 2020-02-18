const React = require('react');
const ReactDOM = require('react-dom');

const cache = new Map();

function niceDate(date) {
    return new Date(date).toLocaleDateString('ru');
}

function getDataGitHub(query, mask, cb) {//Получение данных с GitHub. query - строка запроса, mask - массив с названиями свойств. Т.к. мы получаем ответ в виде объекта у которого очень много свойств, мы скопируем только нужные нам свойства из этого ответа, cb - функция обратного вызова. В ней мы можем устанавливать наши состояния.
    let xhr = new XMLHttpRequest();
        xhr.open('GET', query);
        xhr.onload = ()=>{
            let data = [];
            if(xhr.status=='200') {
                let jsonData = JSON.parse(xhr.response);
                if(!Array.isArray(jsonData))
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
            cb(data, xhr.status);//Вызовем колбек с получившимся массивом объектов
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
    const [error, seterror] = React.useState(null);
    const [loading, setloading] = React.useState(false);
    
    addRepoName = function(name) {//Дополним строку поиска выбранным в списке репозиторием и поищем issues по нему
        setrepoList([]);//Мы уже выбрали репозиторий, по этому список доступных репозиториев можно очистить
        setSearchString(name);
        props.handleClick(name);
    }
    
    getRepoGitHub = function(page, userName, size) {//Получим с GitHub список репозиториев пользователя
        let mask = ['name', 'id', 'full_name'];
        cb = function(result, status) {
            if(status!==200)
                return seterror(status + ' Ошибка загрузки списка репозиториев.');
            let arrFromGitHub = result.map((i, index)=>{//Если список репозиториев большой, покажем первые 10 значений
                i.visibility= true;
                return i;
            });
            if (cache.get(userName))
                cache.set(userName, cache.get(userName).concat(result));
            else
                cache.set(userName, result);
            if(cache.get(userName).length == size) {//Если получили все репозитории отобразим их.
                setrepoList(cache.get(userName));
                setloading(false);
            }
        }
        getDataGitHub('https://api.github.com/users/'+userName+'/repos?per_page=100&page='+page, mask, cb);
    }
    
    getRepoCountGitHub = function(userName) {
        setloading(true);
        let mask = ['public_repos'];
        cb = function(result, status) {
            if(status!==200)
                return seterror(status + ' Ошибка получения пользователя.');
            let size = Math.ceil(result[0].public_repos/100);
            for(let i=1; i<size+1;i++) {
                getRepoGitHub(i, userName, result[0].public_repos);
            }
        };
        getDataGitHub('https://api.github.com/users/'+userName, mask, cb);
    }
    
    onChange = function(e) {//Вводим текст в стороку поиска с клавиатуры
        let val = e.target.value;
        let indRepo = val.indexOf('/'); //индекс символа /
        setSearchString(val);
        if(val[val.length-1] == '/') {//Если введен символ /, значит имя пользователя введено. Поищим его репозитории
            let userName = val.slice(0, val.length-1);
            if(cache.has(userName)){
                setrepoList(cache.get(userName));
                setloading(false);
                return;
            }
//            getRepoGitHub(1, userName, []);
            getRepoCountGitHub(userName);
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
    
    closeMessage = function() {
        seterror(null);
        setloading(false);
    }
    
    return(
        <div className='SearchString'>
            <Message close={closeMessage}>{error}</Message>
            {loading && <Loading />}
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
            currentIssue:null, 
            error:null
        };
        this.getIssuesGitHub = this.getIssuesGitHub.bind(this);
        this.getOneIssueGitHub = this.getOneIssueGitHub.bind(this);
        this.closeMessage = this.closeMessage.bind(this);
    }
    
    getIssuesGitHub(data) {//Получение данных с GitHub со списком Issues
        let mask = ['number', 'title', 'created_at', 'url'];
        getDataGitHub('https://api.github.com/repos/'+data+'/issues', mask, (result, status)=>{
            if(status!==200)
                return this.setState({error: status + ' Ошибка загрузки списка issues.'});
            this.setState({issues:result})
        });
    }
    
    getOneIssueGitHub(data) {//Получим детальную информацию по одному issues с GitHub
        let mask = ['number', 'title', 'created_at', 'body', 'state', 'updated_at', 'user.login', 'user.html_url', 'user.avatar_url'];
        getDataGitHub(data, mask, (result, status)=>{
            if(status!==200)
                return this.setState({error: status + ' Ошибка загрузки issue.'});
            this.setState({currentIssue:result[0]})
        });
    }
    
    closeMessage() {
        this.setState({error:null});
    }
    
    render() {
        return(
            <React.Fragment>
                <Message close={this.closeMessage}>{this.state.error}</Message>
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

class Message extends React.Component {//Сообщение. Используется для уведомления об ошибках
    render() {
        if (this.props.children)
            return (
                ReactDOM.createPortal(
                    <div className='message'>
                        <h1>{this.props.children}</h1>
                        <button onClick={this.props.close}>OK</button>
                    </div>,
                document.querySelector('body'))
            );
        return null;
    }
    
}

class Loading extends React.Component {//Индикатор загрузки
    constructor(props) {
        super(props);
        this.state = {
            indicator: '',
            idInterval:null
        }
    }
    
    componentDidMount() {//Запустим таймер для индикации загрузки
        if(this.state.idInterval===null) {
            let idInterval = setInterval(()=>this.setState({indicator:(this.state.indicator.length<3)?this.state.indicator + '.':''}), 1000);
            this.setState({idInterval:idInterval});
        }
    }
    
    componentWillUnmount() {//Индикатор загрузки больше не нужен. Удалим таймер
        if(this.state.idInterval) {
            clearInterval(this.state.idInterval);
        }
    }
    
    render() {
        return <p className="loading">Загрузка{this.state.indicator}</p>
    }
        
}

ReactDOM.render(
  <App />,
  document.getElementById('main')
);