// 모듈 - 설치 필요 npm install xxxxx --save
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser'); // 쿠키 모듈
const expressSession = require('express-session') //세션을 쓰기 위해 쿠키모듈 필요
const bodyParser = require('body-parser');
const mysql = require('mysql');
const multer =require('multer');//파일업로드 용 모듈

//multer 파일 업로드
const storage = multer.diskStorage({
    destination : (req,file,callback)=>{
        callback(null,'public/uploads/')
    },
    filename : (req,file,callback)=>{
        callback(null, Date.now() + file.originalname)
    }
})
const myMulter = multer({ limits: { fileSize: 5 * 1024 * 1024 },storage:storage});

// mysql
const conn = mysql.createConnection({
    host:'localhost',
    user:'root',    // db user
    password :'java0000',   // db password
    database : 'nodedb'  // db database
});
// 서버 설정
app.set('views',__dirname + '/views');
app.set('view engine','ejs');//view 엔진 ejs
 
// 정적 미들웨어
app.use(express.static(__dirname+'/public'));
// post 미들웨어
app.use(cookieParser());
app.use(expressSession({
    secret:'kiiany', //암호화
    resave:true,
    saveUninitialized:true
}));
app.use(bodyParser.urlencoded({extended : true}));

//session지정 미들웨어 //viwe 에서 session을 통해 가져올수 있다
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
 

    //회원가입
    //회원가입 폼
    router.get('/join',(req,res)=>{
        console.log('회원가입 폼 요청');
        if(req.session.login_member){
            console.log('이미 로그인 되어있습니다');
            res.redirect('/boardList');
        }else{
        res.render('join');
        };
    });

    //회원가입 액션

    /* 중복 아이디 체크를 위한 쿼리
    select member_id from 
    (select member_id from member 
    union 
    select member_id from oldid) t1 
    where t1.member_id = ?
   */
    router.post('/join',(req,res)=>{
        console.log('회원가입 액션 요청');
        if(req.session.login_member){
            console.log('이미 로그인 되어있습니다');
            res.redirect('/boardList');
        }else{
            const member_id = req.body.member_id;
            const member_pw = req.body.member_pw;
            const member_name = req.body.member_name;
            conn.query('select member_id from (select member_id from member union select member_id from memberid) t1 where t1.member_id = ?',
            [member_id],(err,rs)=>{
                console.log('rs :' + rs);
                if(rs.length!=0){ // rs 에 값이 있으면 회원 가입 중지 
                    console.log('중복된 아이디가 있습니다. 다른 아이디로 시도 해주세요.')
                    res.redirect('/join');
                }else{            // rs 에 값이 없을 경우에만 회원 가입 진행 됨       
                    console.log('중복 아이디 없음 정상적으로 회원 가입 합니다.')
                    conn.query('INSERT INTO member(member_id,member_pw,member_name) VALUES(?,?,?)',[member_id,member_pw,member_name],(err,rs)=>{
                        res.redirect('/login');//로그인 화면으로 이동
                    });
                }
            })
        };
    });

    //회원탈퇴
    //회원탈퇴 폼
    router.get('/out',(req,res)=>{
        console.log('회원탈퇴 폼 요청');
        if(!req.session.login_member){//로그인 해야 사용가능
            console.log('로그인 먼저 하세요');
            res.redirect('/login');
        }else{
            res.render('out');
        };
    });

    //회원탈퇴 액션
    router.post('/out',(req,res)=>{
        console.log('회원탈퇴 액션 요청');
        if(!req.session.login_member){//로그인 해야 사용 가능
            res.redirect('/login');
        }else{
            const member_id = req.body.member_id;
            const member_pw = req.body.member_pw;
            const member_name = req.session.login_member.member_name;//로그인 된 회원 정보(이름)
            conn.query('DELETE FROM member WHERE member_id =? AND member_pw=? AND member_name=?',
            [member_id,member_pw,member_name],(err,rs)=>{
                if(err){
                    console.log(err);
                    res.end();
                }else{
                    console.log('탈퇴 완료')
                    conn.query('INSERT INTO memberid(member_id,memberid_date) VALUES(?,now())',
                    [member_id],(err,rs)=>{
                        console.log('탈퇴한 날과 탈퇴한 ID 값을 memberid에 저장');
                        res.redirect('/logout');
                    });                   
                }
            });
        };
    });

    //로그인 폼
    router.get('/login',(req,res)=>{
        console.log('로그인 폼 요청');
        //로그인 되어있다면... 이슈1.
        if(req.session.login_member){
            console.log('이미 로그인 되어있습니다');
            res.redirect('/boardList');//로그인 되어있을시 보드 리스트로 이동
        }else{
        res.render('login');//비로그인 시 로그인 뷰를 보여준다.
        };
    });
    //로그인 액션
    router.post('/login',(req,res)=>{
        console.log('로그인 액션 요청');
        const member_id = req.body.member_id;
        const member_pw = req.body.member_pw;
        conn.query('SELECT member_id,member_name FROM member WHERE member_id=? AND member_pw =?',
                    [member_id,member_pw],(err,rs)=>{
                    if(rs.length == 0){
                    console.log('로그인 실패 했습니다.');
                    res.redirect('/login');//실패시 로그인 폼으로 이동
                    }else{
                    // Session에 저장
                    console.log('로그인 성공');
                    req.session.login_member={//세션에 값 담기
                        member_id:rs[0].member_id, // 키값 : 입력값
                        member_name:rs[0].member_name
                    };
                    console.log(req.session.login_member.member_name);//세션에 담긴 값 확인
                    res.redirect('/boardList');//로그인 후 보드리스트로 이동
                };
        });
    });

    //로그아웃
    router.get('/logout',(req,res)=>{
        console.log('로그아웃 요청');
        req.session.destroy((err)=>{
            console.log('로그아웃 되었습니다.');
            res.redirect('/login');//로그아웃 성공 후 로그인 폼으로 이동
        });
    });

    // 수정 요청
    // 수정폼
    router.get('/updateBoard/:board_no',(req,res)=>{//:뒤에 URL값을 board_no로 받겟다//퍼머링크(params)
        console.log('/updateBoard 수정폼 요청');
        if(!req.session.login_member){
            console.log('로그인 먼저 해주세요');
            res.redirect('/login');
        }else{
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
        if(!req.session.login_member){
            console.log('로그인 먼저 해주세요');
            res.redirect('/login');
        }else{
            const board_no = req.body.board_no;
            const board_pw = req.body.board_pw;
            const board_title = req.body.board_title;
            const board_content = req.body.board_content;
            conn.query('UPDATE board SET board_title=?,board_content=? WHERE board_pw=? AND board_no=?'
                    ,[board_title,board_content,board_pw,board_no],(err,rs)=>{
                if(err){
                    console.log(err);
                    res.end();
                }else{
                    res.redirect('/boardList');
                }
            }) 
      }
    });


     // 삭제 요청
    // 삭제폼(비밀번호 확인을 위한 )
    router.get('/deleteBoard/:board_no',(req,res)=>{
        console.log('/deleteBoard 삭제 요청');
        if(!req.session.login_member){
            console.log('로그인 먼저 해주세요');
            res.redirect('/login');
        }else{
            const board_no = parseInt(req.params.board_no);
            console.log(board_no);
            res.render('deleteBoard',{deleteBoard:board_no});
        }
    });
    // 삭제액션
    router.post('/deleteBoard',(req,res)=>{
        console.log('/deleteBoard 삭제 처리');
        if(!req.session.login_member){
            console.log('로그인 먼저 해주세요');
            res.redirect('/login');
        }else{
            const board_no = req.body.board_no;
            const board_pw = req.body.board_pw;
            conn.query('DELETE FROM board WHERE board_no =? AND board_pw=? AND board_user=?'
                    ,[board_no,board_pw,req.session.login_member.member_id],(err,rs)=>{
                if(err){
                    console.log(err);
                    res.end();
                }else{
                    res.redirect('/boardList');
                }
            });
       }
    });


    // 상세내용 보기
    router.get('/boardDetail/:board_no',(req,res)=>{ 
        console.log('/boardDetail 요청');
        const model = {};
        if(!req.session.login_member){
            console.log('로그인 먼저 해주세요');
            res.redirect('/login');
        }else{
            if(!req.params.board_no){
                res.redirect('boardList');
            }else{
                console.log('게시글 내용 가져오기')
                conn.query('SELECT board_no,board_title,board_content,board_user,board_date FROM board WHERE board_no=?'
                        ,[parseInt(req.params.board_no)],(err,rs)=>{
                            model.boardDetail = rs[0];
                    if(err){
                        console.log(err);
                        res.end();
                    }else{
                        console.log('파일 내용 가져오기')
                        conn.query('SELECT boardfile_name,boardfile_ext,boardfile_type FROM boardfile WHERE board_no=?'
                        ,[parseInt(req.params.board_no)],(err,rs)=>{
                            model.boardfile = rs[0];
                            res.render('boardDetail',{model:model});
                        });                        
                    };
                });
            }
        }
    });

    // 기본 리스트 요청
    router.get('/boardList',(req,res)=>{
        res.redirect('/boardList/1');
    });

     // 원하는 리스트 요청
     router.get('/boardList/:currentPage',(req,res)=>{
        console.log('/boardList 요청');
        
        let rowPerPage = 10;    // 페이지당 보여줄 글목록 : 10개
        let currentPage = 1;    //기본페이지 초기화
        if(req.params.currentPage){    
            currentPage = parseInt(req.params.currentPage);  
        }
        let beginRow =(currentPage-1)*rowPerPage; // DB에 저장된 행의 번호 구하기(보여줄페이지-1 * 보여줄페이지양) = 보여줄 행의 시작번호
        console.log(`currentPage : ${currentPage}`);
        let model = {};

         //전체 글목록 행 갯수 구하기
        conn.query('SELECT COUNT(*) AS cnt FROM board',(err,result)=>{ 
            if(err){
                console.log(err);
                res.end();
            }else{
                console.log(`totalRow : ${result[0].cnt}`);
                let totalRow = result[0].cnt;
                lastPage = Math.trunc((totalRow / rowPerPage)) ; //소수 정수로 만들기
                if(totalRow%rowPerPage != 0){//나머지가 0 일때 1 더해주기
                    lastPage++;
                }          
                console.log(lastPage);
            }
            // 페이징 넘버링 하기
            let pageList = [];//배열 변수 선언
            for (let i = 0 ; i<10 ; i++) { // 표현할 넘버링 양 = 10 개
                if(currentPage > rowPerPage/2) {
                    pageList[i] = i+(currentPage-((rowPerPage/2)-1));//5번째 칸에 현제 페이지를 노출시키기위해서
                }else {
                    pageList[i] = i+1; // 위 조건을 만족하지 못하면 순서대로 적용
                }
            }
            console.log(pageList);//배열에 담긴 값 확인

            // 게시글 내용 가져오기

            conn.query('SELECT board_no,board_title,board_user FROM board ORDER BY board_no DESC LIMIT ?,?'
                    ,[beginRow,rowPerPage],(err,rs)=>{   //DB에서 가져올값 행의 시작번호와 가져올 행의 양
                if(err){   
                    console.log(err);
                    res.end();
                }else{
                    model.boardList = rs; // DB에서 가져온 값 저장
                    model.currentPage = currentPage; // 보여줄(현재) 페이지
                    model.lastPage = lastPage;// 마지막 페이지
                    model.pageList = pageList;// 보여줄 페이지가 담긴 배열
                    res.render('boardList',{model:model});
                }
            });
        });  
    });

    // 입력 요청
    // 입력폼
    router.get('/addBoard',(req,res)=>{
        //session 값 검증
        if(!req.session.login_member){
            console.log('로그인 먼저 해주세요');
            res.redirect('/login');
        }else{            
            console.log('/addBoard 입력폼 요청');
            res.render('addBoard');
        }
       
    });
    // 입력액션
    router.post('/addBoard'
                ,myMulter.single('file') //파일이 있으면 파일을 받고 저장 한다.
                ,(req,res)=>{
        console.log('/addBoard 입력액션 요청');

        if(!req.session.login_member){
            console.log('로그인 먼저 해주세요');
            res.redirect('/login');
        }else{

            const boardPw = req.body.board_pw;
            const boardTitle = req.body.board_title;
            const boardContent = req.body.board_content;
            const boardUser = req.session.login_member.member_id;
            const boardFile = req.file;
   
            conn.query('INSERT INTO board(board_pw,board_title,board_content,board_user,board_date) VALUES(?,?,?,?,now())'
                  ,[boardPw , boardTitle , boardContent , boardUser], (err, rs)=>{
                if(err){
                    console.log(err);
                    res.end();
                }else{
                    conn.query('SELECT MAX(board.board_no)board_no FROM board',(err,rs)=>{// 마지막 board_no 값 가져오기
                        const boardNo = rs[0].board_no;
                        const boardfileName = boardFile.filename;
                        const boardfileExt = boardFile.originalname.substring(boardFile.originalname.lastIndexOf('.')+1);//확장자 구하기
                        const boardfileType = boardFile.mimetype;
                        const boardfileSize = boardFile.size;
                        console.log(boardNo)
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
                };
            }); 
        };  
    });


app.use('/',router);
// 미들웨어 설정 끝
// 80번포트 웹서버 실행
app.listen(80, function () {
    console.log('Example app listening on port 80!');
});