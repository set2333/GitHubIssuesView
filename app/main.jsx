const React = require('react');
const ReactDOM = require('react-dom');

function getDataGitHub(query, mask, cb) {//Получение данных с GitHub. query - строка запроса, mask - массив с названиями свойств. Т.к. мы получаем ответ в виде объекта у которого очень много свойств, мы скопируем только нужные нам свойства из этого ответа, cb - функция обратного вызова. В ней мы можем устанавливать наши состояния.
    let xhr = new XMLHttpRequest();
        xhr.open('GET', query);
        xhr.onload = ()=>{
            if(xhr.status=='200') {
                let jsonData = JSON.parse(xhr.response);
                if(!Array.isArray(jsonData))
                    jsonData = [jsonData];
                let data = jsonData.map((item)=>{//Обработаем каждый объект из массива ответов и вернем массив с полученными объектами
                    return mask.reduce((prev, key)=>{//Вернем объект только с нужными нам свойствами
                        prev[key] = (!item[key])?null:item[key];//Если в ответе нет нужного свойства установим свойство в null
                        return prev;
                    }, {});
                });
                cb(data);//Вызовес колбек с получившимся массивом объектов
            }
        };
        xhr.send();
}

function RepoList(props) {//Список репозиториев для дополнения строки поиска
    return(
        <ul>
            {
                props.children.map((item)=>{
                    return(<li onClick={props.handleClick.bind(this, item.full_name)} key={item.id}>{item.name}</li>);
                })
            }
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
        getDataGitHub('https://api.github.com/users/'+searchString+'/repos', mask, (result)=>{setrepoList(result);});
    }
    
    onChange = function(e) {
        setSearchString(e.target.value);
        if(e.target.value[e.target.value.length-1] == '/') {//Если введен символ /, значит имя пользователя введено. Поищим его репозитории
            getRepoGitHub();
        }
        if(!~e.target.value.indexOf('/')) {//Если в строке нет символа / список репозиториев не нужен. Уберем его
           setrepoList([]);
        }
    }
    
    return(
        <div>
            <input onChange={onChange} value={searchString}></input>
            <button onClick={()=>{setrepoList([]); props.handleClick.call(this, searchString)}}>Поиск</button>
            <RepoList handleClick={addRepoName}>{repoList}</RepoList>
        </div>
    );
}

function ListIssues(props) {//Список Issues
    return(
        <ul>
            {props.issues.map((i)=>{
                 return <li onClick={props.handleClick.bind(this, i.url)} key={i.number}>{i.number}{i.title}{i.created_at}</li>;
             })}
        </ul>
    );
}

function IssuePage(props) {//Страница с детальной информацией
    if(props.issue === null)
        return null;
    return(
        <div>
            <h1>{props.issue.number}</h1>
            <h1>{props.issue.title}</h1>
            <h1>{props.issue.created_at}</h1>
        </div>
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
        let mask = ['number', 'title', 'created_at'];
        getDataGitHub(data, mask, (result)=>{this.setState({currentIssue:result[0]})});
    }
    
    render() {
        return(
            <div>
                <div>
                    <SearchString handleClick={this.getIssuesGitHub}/>
                    <ListIssues handleClick={this.getOneIssueGitHub} issues={this.state.issues} />
                </div>
                <div>
                    <IssuePage issue={this.state.currentIssue}/>
                </div>
            </div>
            
        );
    }
} 

ReactDOM.render(
  <App />,
  document.getElementById('main')
);