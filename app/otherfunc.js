function niceDate(date) {//Дата в красивом формате
    return new Date(date).toLocaleDateString('ru');
}

export { niceDate }