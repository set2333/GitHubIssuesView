import { connect } from 'react-redux';
import React from 'react';
import { getGihHubRepos, getGitHubUser, getGitHubIssueList, getGitHubIssueOne } from './githubfunc';
import { store, cache } from './store';
import { niceDate } from './otherfunc';

class ClLoadingIndicator extends React.PureComponent {//Индикатор загрузки
  render() {
    return (this.props.store.loadingIndicator)?(<div className='loading'></div>):null;
  }
}

class ClMessage extends React.Component {//Сообщение. Используется для уведомления об ошибках
    render() {
      if(!this.props.store.message)
        return null;
      return ReactDOM.createPortal(
        <div className='message'>
          <h1>{this.props.store.message}</h1>
          <button onClick={this.props.setMessage.bind(this, '')}>OK</button>
        </div>, document.querySelector('body'));
    }
}

class ClRepoList extends React.PureComponent {//Список репозиториев для дополнения строки поиска
  render() {
    if(!this.props.store.repoList.length)
      return null;
    return <div className='repoList'>
      <ul>
        {this.props.store.repoList.map((item)=><li onClick={getGitHubIssueList.bind(this, item.name, item.full_name)} key={item.id}>{item.name}</li>)}
      </ul>  
    </div>  
  }
}

class ClIssueList extends React.PureComponent{//Список обращений
  render() {
    return <ul className='listIssues'>
      {this.props.store.issueList.map((item)=><li onClick={getGitHubIssueOne.bind(this, item.url)} key={item.number}>{item.title}</li>)}
    </ul>  
  }
}

class ClIssuePage extends React.Component {//Страница с детальной информацией об обращении
  render() {
    if(!this.props.store.currentIssue)
      return null;
    return <div>
      <div className='issueInfo'>
        <p><img className='avatarImg' src={this.props.store.currentIssue.user.avatar_url} alt={this.props.store.currentIssue.user.login}/>
          <a href={this.props.store.currentIssue.user.html_url}>{this.props.store.currentIssue.user.login}</a></p>
        <p>№:{this.props.store.currentIssue.number}</p>
        <p>Статус: {this.props.store.currentIssue.state}</p>
        <p>Созданно: {niceDate(this.props.store.currentIssue.created_at)}</p>
        <p>Обновленно: {niceDate(this.props.store.currentIssue.updated_at)}</p>
      </div>  
      <div>
        <h1>{this.props.store.currentIssue.title}</h1>
        <p>{this.props.store.currentIssue.body}</p>
      </div>  
    </div>  
  }
}

class ClSearch extends React.PureComponent {//Механизм поиска обращений
  constructor(props) {
    super(props);
    this.onFocus = this.onFocus.bind(this);
    this.onChange = this.onChange.bind(this);
  }
  
  onFocus() {
    if(this.props.store.userName && !this.props.store.repoName) {
      if(cache.has(this.props.store.userName)) 
        this.props.setRepoList(cache.get(this.props.store.userName))
      else
        getGitHubUser(this.props.store.userName);
    }
  }
  
  onChange(e) {
    let list = cache.get(this.props.store.userName);
    this.props.onChangeRepoName(e, list?list:[]);
  }
  
  render() {
    return <div className='SearchString'>
      <p>Пользователь 
      <input value={this.props.store.userName} onChange={this.props.onChangeUserName}></input>
      Репозиторий 
      <input value={this.props.store.repoName} onChange={this.onChange} onFocus={this.onFocus}></input>
      
      <button onClick={getGitHubIssueList.bind(this, this.props.store.repoName, this.props.store.userName+'/'+this.props.store.repoName)}>Найти</button></p>
      <LoadingIndicator />
      <RepoList />
    </div>
  }
}

class ClApp extends React.Component {//Корневой компанент
  render() {
    return <>
      <Message />
      <Search />
      <div className='blockSearch'>
        <IssueList />
      </div>
      <div className='blockIssue'>
        <IssuePage />
      </div>  
      </>;
  }
}

const connector = connect(
  (state)=>({ store:state }),
  (dispatch)=>({
    onChangeUserName: (e)=>dispatch({ type:'ON_CHANGE_USER_NAME', value:e.target.value}),
    onChangeRepoName: (e, list)=>dispatch({ type:'ON_CHANGE_REPO_NAME', value:e.target.value, list}),
    setRepoList: (list)=>dispatch({ type:'SET_REPO_LIST', list}),
    setMessage: (value)=>dispatch({ type:'SET_MESSAGE', value})
  })
);


const App = connector(ClApp);
const Search = connector(ClSearch);
const RepoList = connector(ClRepoList);
const IssueList = connector(ClIssueList);
const IssuePage = connector(ClIssuePage);
const LoadingIndicator = connector(ClLoadingIndicator);
const Message = connector(ClMessage);

export { App, Search };