export class Matcher {
    canidateCheck: Function;
    getToken: Function;
    constructor(canidateCheck: Function, getToken: Function) {
        this.canidateCheck = canidateCheck;
        this.getToken = getToken;
    }
}