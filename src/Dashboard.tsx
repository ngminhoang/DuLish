import { useState } from 'react';
// 1. Import các dịch vụ Firebase từ file cấu hình của bạn
import { auth, GoogleAuthProvider, signInWithCredential } from './firebase';

const CLIENT_ID = '280739678981-80dvcken6argmgfkait1ne5ug6bk9ink.apps.googleusercontent.com';
const SCOPES = ['openid', 'email', 'profile'];

function debug(...args: any[]) {
    console.log('[DASHBOARD]', ...args);
}

export default function Dashboard() {
    const [status, setStatus] = useState<string | null>(null);

    const openGoogleAuth = async () => {
        debug('Khởi động luồng đăng nhập...');
        setStatus('Đang kết nối với Google...');

        try {
            const redirectUri = chrome.identity.getRedirectURL();
            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.set('client_id', CLIENT_ID);
            authUrl.searchParams.set('response_type', 'token');
            authUrl.searchParams.set('redirect_uri', redirectUri);
            authUrl.searchParams.set('scope', SCOPES.join(' '));
            authUrl.searchParams.set('prompt', 'consent');

            chrome.identity.launchWebAuthFlow(
                {
                    url: authUrl.toString(),
                    interactive: true,
                },
                async (redirectUrl) => { // Chuyển thành async để await Firebase
                    if (chrome.runtime.lastError) {
                        const errMsg = chrome.runtime.lastError.message || 'Lỗi không xác định';
                        setStatus(`Lỗi: ${errMsg}`);
                        return;
                    }

                    if (redirectUrl) {
                        const url = new URL(redirectUrl);
                        const params = new URLSearchParams(url.hash.substring(1));
                        const accessToken = params.get('access_token');

                        if (accessToken) {
                            setStatus('Đang định danh với Firebase...');

                            // 2. LOGIC TÍCH HỢP FIREBASE: Đổi Google Token lấy Firebase User
                            try {
                                const credential = GoogleAuthProvider.credential(null, accessToken);
                                const userCredential = await signInWithCredential(auth, credential);
                                const user = userCredential.user;

                                // 3. LƯU UID VÀO STORAGE (Để dùng cho các API Save/Load word)
                                await chrome.storage.local.set({
                                    'uid': user.uid,
                                    'userEmail': user.email,
                                    'displayName': user.displayName,
                                    'isLoggedIn': true
                                });

                                setStatus(`Chào ${user.displayName}! Đã sẵn sàng.`);
                                debug('Firebase Login thành công. UID:', user.uid);
                            } catch (fbError) {
                                debug('Lỗi Firebase Auth:', fbError);
                                setStatus('Lỗi: Không thể kết nối database.');
                            }
                        } else {
                            setStatus('Lỗi: Không tìm thấy token.');
                        }
                    } else {
                        setStatus('Đã hủy đăng nhập.');
                    }
                }
            );
        } catch (error) {
            debug('Lỗi hệ thống:', error);
            setStatus('Không thể khởi động hệ thống xác thực.');
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <div style={{ border: '1px solid #e0e0e0', borderRadius: '12px', padding: '20px', maxWidth: '300px', backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, color: '#333' }}>Xác thực DuLish</h3>
                <p style={{ fontSize: '13px', color: '#666' }}>Đăng nhập để đồng bộ từ vựng và dữ liệu của bạn.</p>

                <button
                    onClick={openGoogleAuth}
                    style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#4285F4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    Tiếp tục với Google
                </button>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Trạng thái:</div>
                    <div style={{ fontSize: '12px', color: status?.includes('Lỗi') ? 'red' : '#4caf50', marginTop: '4px' }}>
                        {status || 'Sẵn sàng'}
                    </div>
                </div>
            </div>
        </div>
    );
}