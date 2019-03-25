// 모듈
const express = require('express');
const app = express();
//쿠키와 세션 모듈
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const bodyParser = require('body-parser');
//파일 업로드 모듈
const multer = require('multer');
// 파일을 업로드 하면 req.file로 정보가 들어오고 
// dest 속성에 지정해둔 경로(정적폴더아래(public)/uploads/)에 파일이 저장. 
// limits 속성은 선택 옵션인데 파일사이즈등을 제한할 수 있다.
const myMulter = multer({ 
    dest: 'uploads/', 
    limits: { fileSize: 5 * 1024 * 1024 } 
});
const mysql = require('mysql');
// mysql
const conn = mysql.createConnection({
    host:'localhost',
    user:'root',    // db user
    password :'java0000',   // db password
    database : 'nodedb'  // db database
});
// 서버 설정
app.set('views',__dirname + '/views');
app.set('view engine','ejs');
 
// 정적 미들웨어
app.use(express.static(__dirname+'/public'));
//쿠키와 세션 미들웨어
app.use(cookieParser());
app.use(expressSession({
    secret: 'bongbong', // 세션 암호화(임의의 문자 지정)
    resave: true,       // 세션을 언제나 저장할 지 (변경되지 않아도) 정하는 값
    saveUninitialized: true //세션이 저장되기 전에 uninitialized 상태로 미리 만들어서 저장
}));
// post 미들웨어
app.use(bodyParser.urlencoded({extended : true}));

//session지정 미들웨어 /view 에서 session을 통해 가져올수 있다
app.use((req, res, next)=> {
    if(req.session.login_member){
        res.locals.session = req.session.login_member;
    }else{
        res.locals.session = undefined;
    } 
    next();
});

// 라우터 미들웨어
const router = express.Router();
    //회원탈퇴 폼
    router.get('/out', (req, res)=>{
        console.log('/out 회원탈퇴 폼 요청');

        if(!req.session.login_member) { //세션에 값이 없으면(로그인이 되어있지 않으면)
            console.log('로그인을 먼저 해주세요');
            res.redirect('/login');
        } else {
            res.render('out'); //요청받은 뷰를 보여준다
        }  
    });

    // 회원탈퇴 액션
    router.post('/deleteMember',(req,res)=>{
        const member_id = req.session.login_member.member_id;
        const member_pw = req.body.member_pw;
        console.log(member_id+'<--member_id');
        console.log(member_pw+'<--member_pw');
        
        conn.query('DELETE FROM member WHERE member_id=? and member_pw=?',[member_id, member_pw], (err, rs) => {
            if(err) {
                console.log(err);
                res.end();
            }else {
                conn.query('INSERT INTO memberid(member_id, memberid_date) VALUES(?,curdate())',[member_id], (err, rs) => {
                    if(err) {
                        console.log(err);
                        res.end();
                    }else {
                        res.redirect('/logout');
                    }
                });
            }
        });
    });

    //회원가입 폼
    router.get('/join', (req, res) => {
        console.log('/join 회원가입 폼 요청');
        
        if(!req.session.login_member) { //세션에 값이 없으면(로그인이 되어있지 않으면)
            res.render('join');   //요청받은 뷰를 보여준다
        } else {
            console.log('이미 로그인 되어 있습니다');
            res.redirect('/boardList'); //다른 거 호출
        }     
    });    

    //회원가입 액션
    router.post('/join', (req, res) => {
        console.log('/join 회원가입 요청');

        if(!req.session.login_member) { //세션에 값이 없으면(로그인이 되어있지 않으면)
            const member_id = req.body.member_id;
            const member_pw = req.body.member_pw;
            const member_name = req.body.member_name;

            conn.query('SELECT member_id FROM (SELECT member_id FROM member UNION SELECT member_id FROM memberid) t1 WHERE t1.member_id = ?', 
            [member_id], 
            (err, rs)=>{
                console.log('아이디 중복 검사를 위한 모든 아이디 검색');
                if(err) {
                    console.log('쿼리 실행 오류');
                    res.end();
                } else {
                    if(rs.length!=0) { //배열의 길이가 0이 아니면 -> 결과값이 있으면
                        console.log('가입한 적이 있는 아이디입니다');
                        res.redirect('/join');
                    } else {
                        //회원 가입하는 쿼리문
                        conn.query('INSERT INTO member(member_id, member_pw, member_name) VALUES (?, ?, ?)', 
                        [member_id, member_pw, member_name], 
                        (err, rs)=>{
                            if(err){
                                console.log(err);
                                res.end();
                            }else{
                                console.log('회원가입이 완료되었습니다. 로그인해주세요');   
                                res.redirect('/login');
                            }
                        });
                    }
                }
            });

           
        } else {
            console.log('이미 로그인 되어 있습니다');
            res.redirect('/boardList'); //다른 거 호출
        }   
    });

    //로그인 폼
    router.get('/login', (req, res)=>{
        console.log('/login 로그인폼 요청');
        //로그인 되어 있다면
        if(!req.session.login_member) {
            res.render('login');    
        } else {
            console.log('이미 로그인 되어 있습니다');
            res.redirect('/boardList');
        }        
    });
    //로그인 액션
    router.post('/login', (req, res)=>{
        const member_id = req.body.member_id;
        const member_pw = req.body.member_pw;
        /*
            SELECT member_id, member_name
            FROM member
            WHERE member_id =? AND member_pw = ?
        */
        conn.query('SELECT member_id, member_name FROM member WHERE member_id =? AND member_pw = ?', 
            [member_id, member_pw], 
            (err, rs)=>{
                if(rs.length == 0 ) {
                    console.log('로그인 실패');
                    res.redirect('/login');
                } else {    
                //세션에 저장
                console.log('로그인 성공');
                req.session.login_member = {
                    member_id:rs[0].member_id, 
                    member_name:rs[0].member_name
                };
                console.log(req.session.login_member.member_name);
                res.redirect('/boardList');
            }
        });
    });

    //로그아웃
    router.get('/logout', (req, res) => {
        console.log('로그아웃 요청');
        req.session.destroy((err)=>{
            res.redirect('/login');
        });
    });

    // 입력 요청
    // 입력폼
    router.get('/addBoard',(req, res)=>{
        //세션이 없으면, 짧은 내용을 먼저 작성해야 else문까지 가독성이 높아진다
        if(!req.session.login_member) {
            console.log('로그인을 먼저 해주세요');
            res.redirect('/login');
        } else {
            console.log('/addBoard 입력폼 요청');
            res.render('addBoard');
        }
    });

    // 입력액션 
    //파일 업로드
    app.post('/addBoard', 
    myMulter.single('file'),    //미들웨어
    (req, res) => { // <input type='file' name='file'>네임을 가진 파일 하나 업로드
    console.log('/addBoard 입력액션 요청'); // 멀티파일업로드 경우 upload.array('이름',파일수), req.files 사용
    
        //액션으로 바로 접근할 수도 있기 때문에 세션을 확인해주는 코드를 추가한다
        if(!req.session.login_member) {
            console.log('로그인을 먼저 해주세요');
            res.redirect('/login');
        } else {
        
            const boardPw = req.body.board_pw;
            const boardTitle = req.body.board_title;
            const boardContent = req.body.board_content;
            const boardUser = req.session.login_member.member_id;
            const boardFile = req.file;            
            
                conn.query('INSERT INTO board(board_pw,board_title,board_content,board_user,board_date) VALUES(?,?,?,?,now())'
                        ,[boardPw , boardTitle , boardContent , boardUser], (err, result)=>{
                    if(err){
                        console.log(err);
                        res.end();
                    }else{
                        conn.query('SELECT MAX(board_no) board_no FROM board',(err,rs)=>{   // 마지막 board_no 값 가져오기
                            const boardNo = rs[0].board_no;
                            const boardfileName = boardFile.filename;
                            const boardfileExt = boardFile.originalname.substring(boardFile.originalname.lastIndexOf('.')+1);//확장자 구하기
                            const boardfileType = boardFile.mimetype;
                            const boardfileSize = boardFile.size;
                            console.log(boardNo);
                            console.log(boardfileExt);
                            conn.query('INSERT INTO boardfile(board_no,boardfile_name,boardfile_ext,boardfile_type,boardfile_size) VALUES(?,?,?,?,?)'
                            ,[boardNo,boardfileName,boardfileExt,boardfileType,boardfileSize],(err,rs)=>{
                                if(err){
                                    console.log(err);
                                    res.end();
                                }else{
                                    res.redirect('/boardList');
                                };                         
                            });
                            
                        });
                    }
                });   
            }
        });

    // 리스트 요청
    router.get('/boardList/:currentPage',(req,res)=>{
        console.log('/boardList 요청');
        let rowPerPage = 10;    // 페이지당 보여줄 글목록 : 10개
        let currentPage = 1;    
        if(req.params.currentPage){    
            currentPage = parseInt(req.params.currentPage);  
        }
        let beginRow =(currentPage-1)*rowPerPage;   
        console.log(`currentPage : ${currentPage}`);
        let model = {};
        conn.query('SELECT COUNT(*) AS cnt FROM board',(err,result)=>{  //전체 글목록 행 개수 구하기
            if(err){
                console.log(err);
                res.end();
            }else{
                console.log(`totalRow : ${result[0].cnt}`);
                let totalRow = result[0].cnt;
                lastPage = totalRow / rowPerPage;   
                if(totalRow % rowPerPage != 0){ 
                    lastPage++;
                }
            }
        
        //페이지 숫자로 세기
        let pageList = [];  //배열 변수 선언
        for (let i=0; i<10; i++) {
            if(currentPage > rowPerPage/2) {
                pageList[i] = i+currentPage-(rowPerPage/2-1);
            } else {
                pageList[i] = i+1;
            }
        }
 
            conn.query('SELECT board_no,board_title,board_user FROM board ORDER BY board_no DESC LIMIT ?,?',
                [beginRow,rowPerPage],
                (err,rs)=>{   
                if(err){   
                    console.log(err);
                    res.end();
                }else{
                    model.boardList = rs;
                    model.currentPage = currentPage;
                    model.lastPage = lastPage;
                    model.pageList = pageList;
                    if(req.session.login_member){
                        model.member_id = req.session.login_member.member_id;
                        res.render('boardList',{model:model});
                    }else{
                        //로그인 전인 상태일 경우에는 member_id값이 null로 넘김
                     
                        res.render('boardList',{model:model});
                    }
                }
            }); 
        });  
    });

    //게시판 목록 리스트 요청을 받으면 board_no를 1로 한 채로 목록 요청해주기
    router.get('/boardList', (req, res) =>{
        res.redirect('boardList/1');
    });

    // 상세내용 보기
    router.get('/boardDetail/:board_no',(req,res)=>{  
        console.log(req.params.board_no);
        console.log('/boardDetail 요청');
        
        if(!req.session.login_member) {
            console.log('로그인을 먼저 해주세요');
            res.redirect('/login');
        } else {
            if(!req.params.board_no){
                res.redirect('boardList');
            }else{
                conn.query('SELECT board_no,board_title,board_content,board_user,board_date FROM board WHERE board_no=?'
                        ,[parseInt(req.params.board_no)],(err,rs)=>{
                    if(err){
                        console.log(err);
                        res.end();
                    }else{
                        //첨부파일 가져오기
                        conn.query('SELECT boardfile_name, boardfile_ext, boardfile_type FROM boardfile WHERE board_no=?', 
                            [parseInt(req.params.board_no)], (err, rs)=>{
                            if(err){
                                console.log(err);
                                res.end();
                            }else{
                                model.boardfile = rs[0];
                                res.render('boardDetail', {model:model});
                            }
                        });
                        res.render('boardDetail',{boardDetail:rs[0]});
                    }
                });
            }
        }
    });
    
    // 삭제 요청
    // 삭제폼(비밀번호 확인을 위한 )
    router.get('/deleteBoard/:board_no',(req,res)=>{
        console.log('/deleteBoard 삭제 요청');

        if(!req.session.login_member) {
            console.log('로그인을 먼저 해주세요');
            res.redirect('/login');
        } else {
            const board_no = parseInt(req.params.board_no);
            console.log(board_no);
            res.render('deleteBoard',{deleteBoard:board_no});
        }
    });
    // 삭제액션
    router.post('/deleteBoard',(req,res)=>{
        console.log('/deleteBoard 삭제 처리');

        if(!req.session.login_member) {
            console.log('로그인을 먼저 해주세요');
            res.redirect('/login');
        } else {
            const board_no = req.body.board_no;
            const board_pw = req.body.board_pw;
            conn.query('DELETE FROM board WHERE board_no =? AND board_pw=? AND board_user=?'
                    ,[board_no, board_pw, req.session.login_member.member_id],(err,rs)=>{
                if(err){
                    console.log(err);
                    res.end();
                }else{
                    res.redirect('boardList');
                }
            });
        }    
    });

    // 수정 요청
    // 수정폼
    router.get('/updateBoard/:board_no',(req,res)=>{
        console.log('/updateBoard 수정폼 요청');

        if(!req.session.login_member) {
            console.log('로그인을 먼저 해주세요');
            res.redirect('/login');
        } else {
            const board_no = parseInt(req.params.board_no);
            console.log(board_no);
            conn.query('SELECT board_no,board_pw,board_title,board_content,board_user FROM board WHERE board_no=?'
                    ,[board_no],(err,rs)=>{
                if(err){
                    console.log(err);
                    res.end();
                }else{
                    res.render('updateBoard',{updateBoard:rs[0]});
                }
            });
        }    
    });
    // 수정액션
    router.post('/updateBoard',(req,res)=>{
        console.log('/updateBoard 수정액션 요청');

        if(!req.session.login_member) {
            console.log('로그인을 먼저 해주세요');
            res.redirect('/login');
        } else {
            const board_no = req.body.board_no;
            const board_pw = req.body.board_pw;
            const board_title = req.body.board_title;
            const board_content = req.body.board_content;
            //
            conn.query('UPDATE board SET board_title=?,board_content=? WHERE board_pw=? AND board_no=?'
                    ,[board_title,board_content,board_pw,board_no],(err,rs)=>{
                if(err){
                    console.log(err);
                    res.end();
                }else{
                    res.redirect('boardList');
                }
            }); 
        }    
    });

// 미들웨어 설정 끝   
app.use('/',router);

// 80번포트 웹서버 실행
app.listen(80, function () {
    console.log('Example app listening on port 80!');
});




