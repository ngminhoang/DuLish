import { useState, useEffect } from 'react';// 1. Import các dịch vụ Firebase từ file cấu hình của bạn
import { auth, GoogleAuthProvider, signInWithCredential } from './firebase';

const CLIENT_ID = '280739678981-80dvcken6argmgfkait1ne5ug6bk9ink.apps.googleusercontent.com';
const SCOPES = ['openid', 'email', 'profile'];

function debug(...args: any[]) {
    console.log('[DASHBOARD]', ...args);
}

export default function Dashboard() {
    // Quản lý trạng thái đăng nhập
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null: đang check, true: đã login, false: chưa login
    const [status, setStatus] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<{ email?: string; name?: string } | null>(null);

    // 2. CHECK LOGIN STATUS KHI MO EXTENSION
    useEffect(() => {
        chrome.storage.local.get(['uid', 'userEmail', 'displayName'], (result) => {
            if (result.uid) {
                setIsLoggedIn(true);
                setUserProfile({ email: result.userEmail, name: result.displayName });
                debug('Đã tìm thấy phiên đăng nhập:', result.uid);
            } else {
                setIsLoggedIn(false);
            }
        });
    }, []);

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
                async (redirectUrl) => {
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

                            try {
                                const credential = GoogleAuthProvider.credential(null, accessToken);
                                const userCredential = await signInWithCredential(auth, credential);
                                const user = userCredential.user;

                                // 3. LƯU THÔNG TIN VÀO STORAGE
                                const sessionData = {
                                    'uid': user.uid,
                                    'userEmail': user.email,
                                    'displayName': user.displayName,
                                    'isLoggedIn': true
                                };

                                await chrome.storage.local.set(sessionData);

                                // Cập nhật State UI
                                setUserProfile({ email: user.email || '', name: user.displayName || '' });
                                setIsLoggedIn(true);
                                setStatus(null); // Reset status về mặc định
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

    const handleLogout = () => {
        chrome.storage.local.remove(['uid', 'userEmail', 'displayName', 'isLoggedIn'], () => {
            setIsLoggedIn(false);
            setUserProfile(null);
            setStatus('Đã đăng xuất.');
            debug('Đã xóa phiên làm việc.');
        });
    };

    // 4. RENDER GIAO DIỆN DỰA TRÊN TRẠNG THÁI
    if (isLoggedIn === null) {
        return <div style={{ padding: '20px' }}>Đang kiểm tra dữ liệu...</div>;
    }

    return (

            <div
                style={{
                    borderRadius: '16px',
                    padding: '20px',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                }}
            >
                {isLoggedIn ? (
                    <div>
                        <h3
                            style={{
                                marginTop: 0,
                                fontSize: '16px',
                                fontWeight: 600,
                                color: '#1e3a8a',
                                textAlign: 'center',
                            }}
                        >
                            DuLish - Học TA bị động
                        </h3>

                        {/* Profile */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                borderRadius: '12px',
                                background: '#f1f5f9',
                                marginBottom: '16px',
                            }}
                        >
                            <div
                                style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                }}
                            >
                                {userProfile?.name?.charAt(0) || 'U'}
                            </div>

                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                                    {userProfile?.name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    {userProfile?.email}
                                </div>
                            </div>
                        </div>

                        {/* Button chính */}
                        <button
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '10px',
                                border: 'none',
                                background:
                                    'linear-gradient(135deg, #3b82f6, #6366f1)',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: '0.2s',
                            }}
                            onMouseOver={(e) =>
                                (e.currentTarget.style.opacity = '0.9')
                            }
                            onMouseOut={(e) =>
                                (e.currentTarget.style.opacity = '1')
                            }
                        >
                            📚 Xem từ vựng
                        </button>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                marginTop: '10px',
                                padding: '8px',
                                borderRadius: '8px',
                                border: '1px solid #fecaca',
                                background: 'transparent',
                                color: '#ef4444',
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            Đăng xuất
                        </button>
                    </div>
                ) : (
                    <div>
                        <h3
                            style={{
                                marginTop: 0,
                                fontSize: '16px',
                                fontWeight: 600,
                                color: '#1e3a8a',
                            }}
                        >
                            🔐 DuLish Auth
                        </h3>

                        <p style={{ fontSize: '13px', color: '#64748b' }}>
                            Đăng nhập để đồng bộ dữ liệu.
                        </p>

                        <button
                            onClick={openGoogleAuth}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '10px',
                                border: '1px solid #e5e7eb',
                                background: '#fff',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                            onMouseOver={(e) =>
                                (e.currentTarget.style.background = '#f9fafb')
                            }
                            onMouseOut={(e) =>
                                (e.currentTarget.style.background = '#fff')
                            }
                        >
                            <img
                                src="https://www.svgrepo.com/show/475656/google-color.svg"
                                width="18"
                            />
                            Tiếp tục với Google
                        </button>

                        {/* Status */}
                        <div
                            style={{
                                marginTop: '14px',
                                borderTop: '1px solid #eee',
                                paddingTop: '10px',
                                fontSize: '12px',
                            }}
                        >
                            <div style={{ fontWeight: 600 }}>Trạng thái</div>
                            <div
                                style={{
                                    color: status?.includes('Lỗi')
                                        ? '#ef4444'
                                        : '#22c55e',
                                }}
                            >
                                {status || 'Sẵn sàng'}
                            </div>
                        </div>
                    </div>
                )}
            </div>



    );
}