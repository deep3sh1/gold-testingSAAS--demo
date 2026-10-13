using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace WinFTMCaptureAgent
{
    public class BranchItem
    {
        public string Key { get; set; }
        public string Name { get; set; }
        public BranchItem(string key, string name)
        {
            Key = key;
            Name = name;
        }
        public override string ToString()
        {
            return Name;
        }
    }

    public class ConfigData
    {
        public string serverUrl { get; set; }
        public string branch { get; set; }
        public string stationId { get; set; }
        public bool lockRegion { get; set; }
        public int regionX { get; set; }
        public int regionY { get; set; }
        public int regionW { get; set; }
        public int regionH { get; set; }
        public string protectionBypassSecret { get; set; }

        public ConfigData()
        {
            serverUrl = "https://lab-saas-server.vercel.app";
            branch = "kalyan";
            stationId = "WINFTM-DESKTOP-01";
            lockRegion = false;
            regionX = 0;
            regionY = 0;
            regionW = 0;
            regionH = 0;
            protectionBypassSecret = "";
        }
    }

    public class ActiveTokenData
    {
        public bool success { get; set; }
        public bool active { get; set; }
        public string message { get; set; }
        public Dictionary<string, object> data { get; set; }
    }

    public class CaptureResultData
    {
        public bool success { get; set; }
        public string message { get; set; }
        public Dictionary<string, object> data { get; set; }
    }

    public class MainCaptureForm : Form
    {
        [DllImport("user32.dll")]
        public static extern bool ReleaseCapture();
        [DllImport("user32.dll")]
        public static extern int SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);
        public const int WM_NCLBUTTONDOWN = 0xA1;
        public const int HT_CAPTION = 0x2;

        [DllImport("user32.dll")]
        public static extern bool RegisterHotKey(IntPtr hWnd, int id, int fsModifiers, int vk);
        [DllImport("user32.dll")]
        public static extern bool UnregisterHotKey(IntPtr hWnd, int id);
        public const int HOTKEY_ID = 9001;
        public const int VK_F9 = 0x78;

        [DllImport("user32.dll")]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        private ConfigData config;
        private string configPath;
        private JavaScriptSerializer json = new JavaScriptSerializer();

        // UI Controls
        private Panel headerPanel;
        private Label titleLabel;
        private Label closeBtn;
        private Label minimizeBtn;
        private ComboBox branchCombo;
        private Panel tokenCard;
        private Label tokenNumLabel;
        private Label tokenCustLabel;
        private Label tokenItemLabel;
        private Button captureBtn;
        private Button snipBtn;
        private CheckBox lockRegionCheck;
        private PictureBox previewBox;
        private Label statusLabel;
        private System.Windows.Forms.Timer refreshTimer;
        private TextBox serverUrlText;
        private Label serverUrlLabel;
        private NotifyIcon trayIcon;

        private Rectangle savedRegion = Rectangle.Empty;
        private volatile bool isCapturing = false;
        private volatile bool isRefreshing = false;
        private string currentBranch = "kalyan";
        private string currentActiveTokenNumber = "";

        public MainCaptureForm()
        {
            LogTrace("Step 1: MainCaptureForm constructor");
            LoadConfig();
            LogTrace("Step 2: InitializeComponent");
            InitializeComponent();
            LogTrace("Step 3: SetupTrayIcon");
            SetupTrayIcon();
            LogTrace("Step 4: RegisterGlobalHotkey");
            RegisterGlobalHotkey();
            LogTrace("Step 5: RefreshActiveToken");
            RefreshActiveToken();
            LogTrace("Step 6: Constructor finished");
        }

        public static void LogTrace(string msg)
        {
            try
            {
                string logFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "agent_debug.log");
                File.AppendAllText(logFile, string.Format("[{0}] {1}\r\n", DateTime.Now.ToString("HH:mm:ss.fff"), msg));
            }
            catch { }
        }

        private void LoadConfig()
        {
            try
            {
                string appDir = AppDomain.CurrentDomain.BaseDirectory;
                configPath = Path.Combine(appDir, "config.json");
                if (File.Exists(configPath))
                {
                    string text = File.ReadAllText(configPath);
                    config = json.Deserialize<ConfigData>(text);
                }
            }
            catch { }

            if (config == null)
            {
                config = new ConfigData();
            }

            if (!string.IsNullOrEmpty(config.branch))
            {
                currentBranch = config.branch;
            }

            if (config.lockRegion && config.regionW > 50 && config.regionH > 50)
            {
                savedRegion = new Rectangle(config.regionX, config.regionY, config.regionW, config.regionH);
            }
        }

        private void SaveConfig()
        {
            try
            {
                if (savedRegion.Width > 0 && savedRegion.Height > 0)
                {
                    config.regionX = savedRegion.X;
                    config.regionY = savedRegion.Y;
                    config.regionW = savedRegion.Width;
                    config.regionH = savedRegion.Height;
                }
                config.lockRegion = lockRegionCheck.Checked;
                config.branch = currentBranch;
                if (serverUrlText != null)
                {
                    config.serverUrl = serverUrlText.Text.Trim();
                }

                string jsonStr = json.Serialize(config);
                File.WriteAllText(configPath, jsonStr);
            }
            catch { }
        }

        private Icon CreateAppIcon()
        {
            try
            {
                using (Bitmap bmp = new Bitmap(16, 16))
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    g.Clear(Color.Transparent);
                    using (Brush brush = new SolidBrush(Color.FromArgb(245, 158, 11)))
                    {
                        g.FillEllipse(brush, 1, 1, 14, 14);
                    }
                    using (Font f = new Font("Segoe UI", 8, FontStyle.Bold, GraphicsUnit.Pixel))
                    using (Brush textBrush = new SolidBrush(Color.FromArgb(15, 23, 42)))
                    {
                        g.DrawString("W", f, textBrush, 3, 2);
                    }
                    return Icon.FromHandle(bmp.GetHicon());
                }
            }
            catch
            {
                return SystemIcons.Application;
            }
        }

        private void SetupTrayIcon()
        {
            try
            {
                trayIcon = new NotifyIcon();
                trayIcon.Icon = CreateAppIcon();
                trayIcon.Text = "GoldScope WinFTM Capture Agent (F9)";
                trayIcon.Visible = true;

                ContextMenu menu = new ContextMenu();
                menu.MenuItems.Add("⚡ Show WinFTM Agent", (s, e) => RestoreWindowToFront());
                menu.MenuItems.Add("📸 Capture Now (F9)", (s, e) => TriggerCaptureAndSend());
                menu.MenuItems.Add("🔄 Sync Active Token", (s, e) => RefreshActiveToken());
                menu.MenuItems.Add("-");
                menu.MenuItems.Add("✕ Exit Agent", (s, e) =>
                {
                    SaveConfig();
                    if (trayIcon != null)
                    {
                        trayIcon.Visible = false;
                        trayIcon.Dispose();
                    }
                    Application.Exit();
                });

                trayIcon.ContextMenu = menu;
                trayIcon.DoubleClick += (s, e) => RestoreWindowToFront();
            }
            catch { }
        }

        public void RestoreWindowToFront()
        {
            try
            {
                if (this.WindowState == FormWindowState.Minimized)
                {
                    this.WindowState = FormWindowState.Normal;
                }
                this.Show();
                this.TopMost = true;
                this.BringToFront();
                this.Activate();
                SetForegroundWindow(this.Handle);
            }
            catch { }
        }

        private void InitializeComponent()
        {
            this.Text = "GoldScope WinFTM Capture";
            this.Size = new Size(330, 215);
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.Manual;
            this.Location = new Point(Screen.PrimaryScreen.WorkingArea.Right - 350, 40);
            this.TopMost = true;
            this.ShowInTaskbar = true; // Always visible in Windows Taskbar
            this.BackColor = Color.FromArgb(15, 23, 42); // Slate 900
            this.DoubleBuffered = true;

            // Header Panel (Draggable, Height 30)
            headerPanel = new Panel();
            headerPanel.Size = new Size(330, 30);
            headerPanel.Location = new Point(0, 0);
            headerPanel.BackColor = Color.FromArgb(30, 41, 59); // Slate 800
            headerPanel.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                {
                    ReleaseCapture();
                    SendMessage(Handle, WM_NCLBUTTONDOWN, HT_CAPTION, 0);
                }
            };

            titleLabel = new Label();
            titleLabel.Text = "⚡ WinFTM Capture";
            titleLabel.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
            titleLabel.ForeColor = Color.FromArgb(245, 158, 11); // Amber
            titleLabel.Location = new Point(8, 6);
            titleLabel.AutoSize = true;
            titleLabel.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                {
                    ReleaseCapture();
                    SendMessage(Handle, WM_NCLBUTTONDOWN, HT_CAPTION, 0);
                }
            };
            headerPanel.Controls.Add(titleLabel);

            closeBtn = new Label();
            closeBtn.Text = "✕";
            closeBtn.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            closeBtn.ForeColor = Color.FromArgb(148, 163, 184);
            closeBtn.Location = new Point(306, 5);
            closeBtn.Size = new Size(18, 18);
            closeBtn.Cursor = Cursors.Hand;
            closeBtn.Click += (s, e) =>
            {
                DialogResult dr = MessageBox.Show(
                    "Do you want to exit the WinFTM Capture Agent completely?\n\n• Choose 'No' to keep it running in System Tray (ready for F9).\n• Choose 'Yes' to exit completely.",
                    "WinFTM Capture Agent",
                    MessageBoxButtons.YesNoCancel,
                    MessageBoxIcon.Question);

                if (dr == DialogResult.No)
                {
                    this.WindowState = FormWindowState.Minimized;
                    if (trayIcon != null)
                    {
                        trayIcon.ShowBalloonTip(1500, "WinFTM Capture", "Running in background. Press F9 anytime to capture!", ToolTipIcon.Info);
                    }
                }
                else if (dr == DialogResult.Yes)
                {
                    SaveConfig();
                    if (trayIcon != null)
                    {
                        trayIcon.Visible = false;
                        trayIcon.Dispose();
                    }
                    Application.Exit();
                }
            };
            headerPanel.Controls.Add(closeBtn);

            minimizeBtn = new Label();
            minimizeBtn.Text = "─";
            minimizeBtn.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            minimizeBtn.ForeColor = Color.FromArgb(148, 163, 184);
            minimizeBtn.Location = new Point(282, 5);
            minimizeBtn.Size = new Size(18, 18);
            minimizeBtn.Cursor = Cursors.Hand;
            minimizeBtn.Click += (s, e) =>
            {
                this.WindowState = FormWindowState.Minimized;
                if (trayIcon != null)
                {
                    trayIcon.ShowBalloonTip(1200, "WinFTM Capture", "Minimized to tray. Press F9 anytime to capture!", ToolTipIcon.Info);
                }
            };
            headerPanel.Controls.Add(minimizeBtn);
            this.Controls.Add(headerPanel);

            int curY = 35;

            // Compact Branch & Sync Bar (Height 24)
            branchCombo = new ComboBox();
            branchCombo.DropDownStyle = ComboBoxStyle.DropDownList;
            branchCombo.Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
            branchCombo.BackColor = Color.FromArgb(30, 41, 59);
            branchCombo.ForeColor = Color.White;
            branchCombo.Location = new Point(10, curY);
            branchCombo.Size = new Size(244, 24);

            branchCombo.Items.Add(new BranchItem("kalyan", "Kalyan (West)"));
            branchCombo.Items.Add(new BranchItem("kalyan_east", "Kalyan (East)"));
            branchCombo.Items.Add(new BranchItem("ulhasnagar", "Ulhasnagar"));
            branchCombo.Items.Add(new BranchItem("dombivli", "Dombivli (East)"));

            int selectIdx = 0;
            for (int i = 0; i < branchCombo.Items.Count; i++)
            {
                BranchItem bi = branchCombo.Items[i] as BranchItem;
                if (bi != null && bi.Key.Equals(currentBranch, StringComparison.OrdinalIgnoreCase))
                {
                    selectIdx = i;
                    break;
                }
            }
            branchCombo.SelectedIndex = selectIdx;
            branchCombo.SelectedIndexChanged += (s, e) =>
            {
                BranchItem bi = branchCombo.SelectedItem as BranchItem;
                if (bi != null)
                {
                    currentBranch = bi.Key;
                }
                SaveConfig();
                RefreshActiveToken();
            };
            this.Controls.Add(branchCombo);

            Button syncBtn = new Button();
            syncBtn.Text = "🔄 Sync";
            syncBtn.Font = new Font("Segoe UI", 7.5f, FontStyle.Bold);
            syncBtn.ForeColor = Color.FromArgb(245, 158, 11);
            syncBtn.BackColor = Color.FromArgb(30, 41, 59);
            syncBtn.FlatStyle = FlatStyle.Flat;
            syncBtn.FlatAppearance.BorderColor = Color.FromArgb(245, 158, 11);
            syncBtn.Location = new Point(258, curY - 1);
            syncBtn.Size = new Size(62, 24);
            syncBtn.Cursor = Cursors.Hand;
            syncBtn.Click += (s, e) =>
            {
                tokenNumLabel.Text = "Syncing...";
                SetStatus("🔄 Checking queue...", Color.FromArgb(245, 158, 11));
                RefreshActiveToken();
            };
            this.Controls.Add(syncBtn);
            curY += 28;

            // Compact Active Token Card (Height 46)
            tokenCard = new Panel();
            tokenCard.Location = new Point(10, curY);
            tokenCard.Size = new Size(310, 46);
            tokenCard.BackColor = Color.FromArgb(30, 41, 59);
            tokenCard.BorderStyle = BorderStyle.FixedSingle;

            tokenNumLabel = new Label();
            tokenNumLabel.Text = "Token: Checking queue...";
            tokenNumLabel.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
            tokenNumLabel.ForeColor = Color.FromArgb(245, 158, 11); // Amber
            tokenNumLabel.Location = new Point(6, 4);
            tokenNumLabel.Size = new Size(185, 18);
            tokenCard.Controls.Add(tokenNumLabel);

            tokenItemLabel = new Label();
            tokenItemLabel.Text = "";
            tokenItemLabel.Font = new Font("Segoe UI", 7.5f, FontStyle.Regular);
            tokenItemLabel.ForeColor = Color.FromArgb(148, 163, 184);
            tokenItemLabel.TextAlign = ContentAlignment.TopRight;
            tokenItemLabel.Location = new Point(190, 4);
            tokenItemLabel.Size = new Size(114, 18);
            tokenCard.Controls.Add(tokenItemLabel);

            tokenCustLabel = new Label();
            tokenCustLabel.Text = "Waiting for customer token...";
            tokenCustLabel.Font = new Font("Segoe UI", 8f, FontStyle.Regular);
            tokenCustLabel.ForeColor = Color.FromArgb(226, 232, 240);
            tokenCustLabel.Location = new Point(6, 24);
            tokenCustLabel.Size = new Size(298, 18);
            tokenCard.Controls.Add(tokenCustLabel);

            this.Controls.Add(tokenCard);
            curY += 52;

            // Compact Capture Button (Height 34)
            captureBtn = new Button();
            captureBtn.Text = "📸 CAPTURE WINFTM & SEND [F9]";
            captureBtn.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            captureBtn.BackColor = Color.FromArgb(16, 185, 129); // Emerald 500
            captureBtn.ForeColor = Color.White;
            captureBtn.FlatStyle = FlatStyle.Flat;
            captureBtn.FlatAppearance.BorderSize = 0;
            captureBtn.Location = new Point(10, curY);
            captureBtn.Size = new Size(310, 34);
            captureBtn.Cursor = Cursors.Hand;
            captureBtn.Click += (s, e) => TriggerCaptureAndSend();
            this.Controls.Add(captureBtn);
            curY += 38;

            // Region & Lock Row (Height 24)
            snipBtn = new Button();
            snipBtn.Text = "✂️ Select Report Region";
            snipBtn.Font = new Font("Segoe UI", 8f, FontStyle.Bold);
            snipBtn.BackColor = Color.FromArgb(51, 65, 85); // Slate 700
            snipBtn.ForeColor = Color.FromArgb(226, 232, 240);
            snipBtn.FlatStyle = FlatStyle.Flat;
            snipBtn.FlatAppearance.BorderSize = 0;
            snipBtn.Location = new Point(10, curY);
            snipBtn.Size = new Size(165, 24);
            snipBtn.Cursor = Cursors.Hand;
            snipBtn.Click += (s, e) => StartSnippingTool();
            this.Controls.Add(snipBtn);

            lockRegionCheck = new CheckBox();
            lockRegionCheck.Text = "Lock Snipped Area";
            lockRegionCheck.Font = new Font("Segoe UI", 8f, FontStyle.Regular);
            lockRegionCheck.ForeColor = Color.FromArgb(148, 163, 184);
            lockRegionCheck.Location = new Point(182, curY + 1);
            lockRegionCheck.Size = new Size(138, 22);
            lockRegionCheck.Checked = config.lockRegion;
            lockRegionCheck.CheckedChanged += (s, e) => SaveConfig();
            this.Controls.Add(lockRegionCheck);
            curY += 28;

            // Compact Status Label (Height 20)
            statusLabel = new Label();
            statusLabel.Text = "Ready • Press F9 anytime to capture";
            statusLabel.Font = new Font("Segoe UI", 8f, FontStyle.Bold);
            statusLabel.ForeColor = Color.FromArgb(16, 185, 129); // Green
            statusLabel.Location = new Point(10, curY);
            statusLabel.Size = new Size(310, 20);
            statusLabel.TextAlign = ContentAlignment.MiddleCenter;
            this.Controls.Add(statusLabel);

            // Hidden background elements (preserving zero null references)
            previewBox = new PictureBox();
            previewBox.Size = new Size(0, 0);
            previewBox.Visible = false;

            serverUrlLabel = new Label();
            serverUrlLabel.Visible = false;

            serverUrlText = new TextBox();
            serverUrlText.Text = config.serverUrl;
            serverUrlText.Visible = false;
            serverUrlText.TextChanged += (s, e) => SaveConfig();

            // Timer for polling queue every 2 seconds
            refreshTimer = new System.Windows.Forms.Timer();
            refreshTimer.Interval = 2000;
            refreshTimer.Tick += (s, e) => RefreshActiveToken();
            refreshTimer.Start();
        }

        private void RegisterGlobalHotkey()
        {
            try
            {
                RegisterHotKey(this.Handle, HOTKEY_ID, 0, VK_F9);
            }
            catch { }
        }

        protected override void WndProc(ref Message m)
        {
            const int WM_HOTKEY = 0x0312;
            if (m.Msg == WM_HOTKEY && m.WParam.ToInt32() == HOTKEY_ID)
            {
                TriggerCaptureAndSend();
            }
            base.WndProc(ref m);
        }

        private void RefreshActiveToken()
        {
            if (isCapturing || isRefreshing) return;
            isRefreshing = true;

            ThreadPool.QueueUserWorkItem((state) =>
            {
                try
                {
                    string branchKey = currentBranch;
                    string primaryBaseUrl = config.serverUrl.TrimEnd('/');
                    
                    List<string> candidateBases = new List<string>();
                    if (!string.IsNullOrEmpty(primaryBaseUrl) && !primaryBaseUrl.Contains("localhost"))
                    {
                        candidateBases.Add(primaryBaseUrl);
                    }
                    if (!candidateBases.Contains("https://lab-saas-server.vercel.app"))
                    {
                        candidateBases.Add("https://lab-saas-server.vercel.app");
                    }
                    if (!candidateBases.Contains("https://lab-saas-client.vercel.app"))
                    {
                        candidateBases.Add("https://lab-saas-client.vercel.app");
                    }
                    if (primaryBaseUrl != null && primaryBaseUrl.Contains("localhost"))
                    {
                        candidateBases.Insert(0, "http://localhost:4000");
                        candidateBases.Insert(1, "http://127.0.0.1:4000");
                    }

                    ActiveTokenData res = null;

                    foreach (string candBase in candidateBases)
                    {
                        try
                        {
                            string url = string.Format("{0}/api/v1/machine/active-token?branch={1}", candBase, Uri.EscapeDataString(branchKey));
                            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                            req.Timeout = 4000;
                            req.KeepAlive = false;
                            req.Method = "GET";
                            req.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
                            req.Accept = "application/json, text/plain, */*";
                            if (!string.IsNullOrEmpty(config.protectionBypassSecret))
                            {
                                req.Headers["x-vercel-protection-bypass"] = config.protectionBypassSecret;
                            }

                            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                            using (StreamReader reader = new StreamReader(resp.GetResponseStream()))
                            {
                                string respText = reader.ReadToEnd();
                                if (!string.IsNullOrEmpty(respText) && (respText.TrimStart().StartsWith("{") || respText.TrimStart().StartsWith("[")))
                                {
                                    res = json.Deserialize<ActiveTokenData>(respText);
                                    if (res != null)
                                    {
                                        break; // Successfully got JSON response!
                                    }
                                }
                            }
                        }
                        catch
                        {
                            // Try next candidate
                        }
                    }

                    if (this.IsHandleCreated && !this.IsDisposed)
                    {
                        this.Invoke(new Action(() =>
                        {
                            try
                            {
                                if (res != null && res.active && res.data != null)
                                {
                                    string tokenNum = res.data.ContainsKey("tokenNumber") ? Convert.ToString(res.data["tokenNumber"]) : "Pending";
                                    string custName = res.data.ContainsKey("customerNameSnapshot") ? Convert.ToString(res.data["customerNameSnapshot"]) : "Customer";
                                    string phone = res.data.ContainsKey("phoneSnapshot") ? Convert.ToString(res.data["phoneSnapshot"]) : "";
                                    string item = res.data.ContainsKey("item") ? Convert.ToString(res.data["item"]) : "";
                                    string weight = res.data.ContainsKey("weight") ? Convert.ToString(res.data["weight"]) : "";
                                    string weightUnit = res.data.ContainsKey("weightUnit") ? Convert.ToString(res.data["weightUnit"]) : "g";

                                    currentActiveTokenNumber = tokenNum;
                                    tokenNumLabel.Text = "Token: " + tokenNum;
                                    tokenCustLabel.Text = string.Format("{0} ({1})", custName, phone);
                                    tokenItemLabel.Text = string.Format("{0} • {1} {2}", item, weight, weightUnit);
                                    captureBtn.Enabled = true;
                                    captureBtn.BackColor = Color.FromArgb(16, 185, 129); // Green
                                    captureBtn.Text = "📸 CAPTURE WINFTM & SEND [F9]";
                                    if (!isCapturing)
                                    {
                                        SetStatus("Ready • Press F9 anytime to capture", Color.FromArgb(16, 185, 129));
                                    }
                                }
                                else if (res != null && (!res.active || res.data == null))
                                {
                                    currentActiveTokenNumber = "";
                                    tokenNumLabel.Text = "Queue is Empty";
                                    tokenCustLabel.Text = "Waiting for token from Reception...";
                                    tokenItemLabel.Text = branchKey.ToUpper();
                                    captureBtn.Enabled = false;
                                    captureBtn.BackColor = Color.FromArgb(71, 85, 105); // Slate 600
                                    captureBtn.Text = "⏳ WAITING FOR TOKEN...";
                                    if (!isCapturing)
                                    {
                                        SetStatus("Queue empty • Waiting for Reception", Color.FromArgb(148, 163, 184));
                                    }
                                }
                                else if (string.IsNullOrEmpty(currentActiveTokenNumber))
                                {
                                    tokenNumLabel.Text = "Queue: Waiting...";
                                    tokenCustLabel.Text = "Waiting for customer sample (" + branchKey + ")";
                                    tokenItemLabel.Text = branchKey.ToUpper();
                                }
                                // If a token was ALREADY loaded, preserve it and don't wipe it out!
                            }
                            catch { }
                        }));
                    }
                }
                catch
                {
                    // Transient network hiccup
                }
                finally
                {
                    isRefreshing = false;
                }
            });
        }

        private void StartSnippingTool()
        {
            try
            {
                this.Hide();
                Thread.Sleep(200);

                using (SnippingForm snip = new SnippingForm())
                {
                    if (snip.ShowDialog() == DialogResult.OK && snip.SelectedRectangle.Width > 50 && snip.SelectedRectangle.Height > 50)
                    {
                        savedRegion = snip.SelectedRectangle;
                        config.lockRegion = true;
                        lockRegionCheck.Checked = true;
                        SaveConfig();
                        SetStatus("✓ Snipped area locked! Click Capture or press F9 to send.", Color.FromArgb(245, 158, 11));
                    }
                }
            }
            finally
            {
                RestoreWindowToFront();
            }
        }

        private void TriggerCaptureAndSend()
        {
            if (isCapturing) return;
            if (string.IsNullOrEmpty(currentActiveTokenNumber))
            {
                RestoreWindowToFront();
                SetStatus("⚠️ Queue is empty! Create token at Reception first.", Color.FromArgb(245, 158, 11));
                return;
            }
            isCapturing = true;

            captureBtn.Enabled = false;
            captureBtn.Text = "⏳ CAPTURING...";
            SetStatus("Capturing WinFTM report...", Color.FromArgb(245, 158, 11));

            Bitmap capturedBmp = null;

            try
            {
                // Hide this form for a clean screenshot
                this.Hide();
                Application.DoEvents();
                Thread.Sleep(250);

                // 1. If locked region is configured, capture that exact screen area
                if (lockRegionCheck.Checked && savedRegion.Width > 50 && savedRegion.Height > 50)
                {
                    capturedBmp = new Bitmap(savedRegion.Width, savedRegion.Height);
                    using (Graphics g = Graphics.FromImage(capturedBmp))
                    {
                        g.CopyFromScreen(savedRegion.Location, Point.Empty, savedRegion.Size);
                    }
                }
                else
                {
                    // 2. Try to auto-detect WinFTM Window
                    IntPtr winftmHwnd = FindWinFTMWindow();
                    if (winftmHwnd != IntPtr.Zero)
                    {
                        SetForegroundWindow(winftmHwnd);
                        Thread.Sleep(150);

                        RECT rect;
                        if (GetWindowRect(winftmHwnd, out rect))
                        {
                            int w = rect.Right - rect.Left;
                            int h = rect.Bottom - rect.Top;
                            if (w > 100 && h > 100)
                            {
                                capturedBmp = new Bitmap(w, h);
                                using (Graphics g = Graphics.FromImage(capturedBmp))
                                {
                                    g.CopyFromScreen(rect.Left, rect.Top, 0, 0, new Size(w, h));
                                }
                            }
                        }
                    }

                    // 3. Fallback: Full screen capture
                    if (capturedBmp == null)
                    {
                        Rectangle bounds = Screen.PrimaryScreen.Bounds;
                        capturedBmp = new Bitmap(bounds.Width, bounds.Height);
                        using (Graphics g = Graphics.FromImage(capturedBmp))
                        {
                            g.CopyFromScreen(Point.Empty, Point.Empty, bounds.Size);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                isCapturing = false;
                captureBtn.Enabled = true;
                captureBtn.Text = "📸 CAPTURE WINFTM & SEND [F9]";
                SetStatus("Capture Error: " + ex.Message, Color.FromArgb(239, 68, 68));
                RestoreWindowToFront();
                return;
            }
            finally
            {
                // GUARANTEED: Form will ALWAYS be restored and brought to front!
                RestoreWindowToFront();
                Application.DoEvents();
            }

            if (capturedBmp != null)
            {
                previewBox.Image = new Bitmap(capturedBmp);
                SetStatus("🚀 Compressing & Uploading Report...", Color.FromArgb(59, 130, 246));

                string base64Img = "";
                using (MemoryStream ms = new MemoryStream())
                {
                    try
                    {
                        ImageCodecInfo jpgEncoder = GetEncoder(ImageFormat.Jpeg);
                        if (jpgEncoder != null)
                        {
                            EncoderParameters encParams = new EncoderParameters(1);
                            encParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 85L);
                            capturedBmp.Save(ms, jpgEncoder, encParams);
                        }
                        else
                        {
                            capturedBmp.Save(ms, ImageFormat.Jpeg);
                        }
                    }
                    catch
                    {
                        ms.SetLength(0);
                        capturedBmp.Save(ms, ImageFormat.Png);
                    }
                    byte[] bytes = ms.ToArray();
                    base64Img = Convert.ToBase64String(bytes);
                }

                ThreadPool.QueueUserWorkItem((state) =>
                {
                    PostCaptureToBackend(base64Img);
                });
            }
        }

        private static ImageCodecInfo GetEncoder(ImageFormat format)
        {
            ImageCodecInfo[] codecs = ImageCodecInfo.GetImageDecoders();
            foreach (ImageCodecInfo codec in codecs)
            {
                if (codec.FormatID == format.Guid)
                {
                    return codec;
                }
            }
            return null;
        }

        private void PostCaptureToBackend(string base64Img)
        {
            try
            {
                string branchKey = currentBranch;
                string primaryBaseUrl = config.serverUrl.TrimEnd('/');

                List<string> candidateBases = new List<string>();
                if (!string.IsNullOrEmpty(primaryBaseUrl) && !primaryBaseUrl.Contains("localhost"))
                {
                    candidateBases.Add(primaryBaseUrl);
                }
                if (!candidateBases.Contains("https://lab-saas-server.vercel.app"))
                {
                    candidateBases.Add("https://lab-saas-server.vercel.app");
                }
                if (!candidateBases.Contains("https://lab-saas-client.vercel.app"))
                {
                    candidateBases.Add("https://lab-saas-client.vercel.app");
                }
                if (primaryBaseUrl != null && primaryBaseUrl.Contains("localhost"))
                {
                    candidateBases.Insert(0, "http://localhost:4000");
                    candidateBases.Insert(1, "http://127.0.0.1:4000");
                }

                var payload = new Dictionary<string, object>
                {
                    { "stationId", config.stationId },
                    { "branch", branchKey },
                    { "tokenNumber", currentActiveTokenNumber },
                    { "reportImageBase64", "data:image/jpeg;base64," + base64Img },
                    { "operatorNotes", "WinFTM Smart Screen Capture" }
                };

                string postData = json.Serialize(payload);
                byte[] postBytes = Encoding.UTF8.GetBytes(postData);

                CaptureResultData result = null;
                string lastError = "";

                foreach (string candBase in candidateBases)
                {
                    try
                    {
                        string url = candBase + "/api/v1/machine/capture-report";
                        HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                        req.Method = "POST";
                        req.ContentType = "application/json";
                        req.ContentLength = postBytes.Length;
                        req.Timeout = 15000;
                        req.KeepAlive = false;
                        req.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
                        req.Accept = "application/json, text/plain, */*";
                        if (!string.IsNullOrEmpty(config.protectionBypassSecret))
                        {
                            req.Headers["x-vercel-protection-bypass"] = config.protectionBypassSecret;
                        }

                        using (Stream reqStream = req.GetRequestStream())
                        {
                            reqStream.Write(postBytes, 0, postBytes.Length);
                        }

                        using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                        using (StreamReader reader = new StreamReader(resp.GetResponseStream()))
                        {
                            string respText = reader.ReadToEnd();
                            if (!string.IsNullOrEmpty(respText) && (respText.TrimStart().StartsWith("{") || respText.TrimStart().StartsWith("[")))
                            {
                                result = json.Deserialize<CaptureResultData>(respText);
                                if (result != null && result.success)
                                {
                                    LogTrace("Capture succeeded via " + candBase);
                                    break;
                                }
                            }
                        }
                    }
                    catch (WebException webEx)
                    {
                        lastError = webEx.Message;
                        LogTrace("Capture failed on " + candBase + ": " + webEx.Message);
                    }
                    catch (Exception ex)
                    {
                        lastError = ex.Message;
                        LogTrace("Capture exception on " + candBase + ": " + ex.Message);
                    }
                }

                if (this.IsHandleCreated && !this.IsDisposed)
                {
                    this.Invoke(new Action(() =>
                    {
                        isCapturing = false;
                        captureBtn.Enabled = true;
                        captureBtn.Text = "📸 CAPTURE WINFTM & SEND [F9]";

                        if (result != null && result.success)
                        {
                            try { System.Media.SystemSounds.Asterisk.Play(); } catch { }
                            SetStatus("✅ Report sent to customer via WhatsApp!", Color.FromArgb(16, 185, 129));
                            RefreshActiveToken();
                        }
                        else
                        {
                            string errMsg = result != null && !string.IsNullOrEmpty(result.message) ? result.message : (!string.IsNullOrEmpty(lastError) ? lastError : "Server response failed");
                            SetStatus("⚠️ " + errMsg, Color.FromArgb(245, 158, 11));
                        }
                    }));
                }
            }
            catch (Exception ex)
            {
                if (this.IsHandleCreated && !this.IsDisposed)
                {
                    this.Invoke(new Action(() =>
                    {
                        isCapturing = false;
                        captureBtn.Enabled = true;
                        captureBtn.Text = "📸 CAPTURE WINFTM & SEND [F9]";
                        SetStatus("Error: " + ex.Message, Color.FromArgb(239, 68, 68));
                    }));
                }
            }
            finally
            {
                isCapturing = false;
            }
        }

        private IntPtr FindWinFTMWindow()
        {
            IntPtr found = IntPtr.Zero;
            EnumWindows((hWnd, lParam) =>
            {
                StringBuilder sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, 256);
                string title = sb.ToString();
                if (!string.IsNullOrEmpty(title) &&
                    (title.IndexOf("WinFTM", StringComparison.OrdinalIgnoreCase) >= 0 ||
                     title.IndexOf("Fischerscope", StringComparison.OrdinalIgnoreCase) >= 0 ||
                     title.IndexOf("Spectrometer", StringComparison.OrdinalIgnoreCase) >= 0))
                {
                    found = hWnd;
                    return false;
                }
                return true;
            }, IntPtr.Zero);

            return found;
        }

        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
        [DllImport("user32.dll")]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        private void SetStatus(string text, Color color)
        {
            if (this.IsHandleCreated && !this.IsDisposed)
            {
                statusLabel.Text = text;
                statusLabel.ForeColor = color;
            }
        }

        protected override void OnShown(EventArgs e)
        {
            LogTrace("OnShown called! Form is visible on screen.");
            base.OnShown(e);
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            LogTrace("OnFormClosing called, reason: " + e.CloseReason + ", cancel: " + e.Cancel);
            try
            {
                UnregisterHotKey(this.Handle, HOTKEY_ID);
            }
            catch { }
            SaveConfig();
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }
            base.OnFormClosing(e);
        }
    }

    public class SnippingForm : Form
    {
        public Rectangle SelectedRectangle { get; private set; }
        private Point startPoint;
        private Point currentPoint;
        private bool isDragging = false;

        public SnippingForm()
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.WindowState = FormWindowState.Maximized;
            this.TopMost = true;
            this.Cursor = Cursors.Cross;
            this.DoubleBuffered = true;
            this.BackColor = Color.Black;
            this.Opacity = 0.35;
            this.ShowInTaskbar = false;
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                isDragging = true;
                startPoint = e.Location;
                currentPoint = e.Location;
            }
            else if (e.Button == MouseButtons.Right)
            {
                this.DialogResult = DialogResult.Cancel;
                this.Close();
            }
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            if (isDragging)
            {
                currentPoint = e.Location;
                this.Invalidate();
            }
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            if (isDragging)
            {
                isDragging = false;
                int x = Math.Min(startPoint.X, currentPoint.X);
                int y = Math.Min(startPoint.Y, currentPoint.Y);
                int w = Math.Abs(startPoint.X - currentPoint.X);
                int h = Math.Abs(startPoint.Y - currentPoint.Y);
                SelectedRectangle = new Rectangle(x, y, w, h);
                this.DialogResult = DialogResult.OK;
                this.Close();
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            if (isDragging)
            {
                int x = Math.Min(startPoint.X, currentPoint.X);
                int y = Math.Min(startPoint.Y, currentPoint.Y);
                int w = Math.Abs(startPoint.X - currentPoint.X);
                int h = Math.Abs(startPoint.Y - currentPoint.Y);

                using (Pen pen = new Pen(Color.FromArgb(245, 158, 11), 2))
                {
                    pen.DashStyle = DashStyle.Dash;
                    e.Graphics.DrawRectangle(pen, x, y, w, h);
                }
            }
        }

        protected override void OnKeyDown(KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Escape)
            {
                this.DialogResult = DialogResult.Cancel;
                this.Close();
            }
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            MainCaptureForm.LogTrace("Main() entered");
            try
            {
                // Clean up any stale/ghost instances so this launch always succeeds
                using (System.Diagnostics.Process current = System.Diagnostics.Process.GetCurrentProcess())
                {
                    MainCaptureForm.LogTrace("Current process: " + current.ProcessName + " (PID " + current.Id + ")");
                    System.Diagnostics.Process[] existing = System.Diagnostics.Process.GetProcessesByName(current.ProcessName);
                    foreach (System.Diagnostics.Process p in existing)
                    {
                        if (p.Id != current.Id)
                        {
                            MainCaptureForm.LogTrace("Killing stale PID " + p.Id);
                            try { p.Kill(); } catch { }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MainCaptureForm.LogTrace("Process cleanup exception: " + ex.Message);
            }

            try
            {
                ServicePointManager.DefaultConnectionLimit = 20;
                try
                {
                    ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | SecurityProtocolType.Tls;
                }
                catch { }

                Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
                Application.ThreadException += (s, e) =>
                {
                    MainCaptureForm.LogTrace("ThreadException: " + e.Exception);
                    try
                    {
                        File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "agent_error.log"),
                            DateTime.Now + " UI Thread Error: " + e.Exception + Environment.NewLine);
                    }
                    catch { }
                };

                AppDomain.CurrentDomain.UnhandledException += (s, e) =>
                {
                    MainCaptureForm.LogTrace("UnhandledException: " + e.ExceptionObject);
                    try
                    {
                        File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "agent_error.log"),
                            DateTime.Now + " Domain Error: " + e.ExceptionObject + Environment.NewLine);
                    }
                    catch { }
                };

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                MainCaptureForm.LogTrace("Calling Application.Run(new MainCaptureForm())...");
                Application.Run(new MainCaptureForm());
                MainCaptureForm.LogTrace("Application.Run() returned normally.");
            }
            catch (Exception ex)
            {
                MainCaptureForm.LogTrace("Fatal Main exception: " + ex.ToString());
                MessageBox.Show("Error in WinFTM Agent:\n\n" + ex.ToString(), "WinFTM Smart Capture Agent", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
