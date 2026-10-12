using System;
using System.IO;
using System.Net;
using System.Diagnostics;
using System.Threading;

namespace PantallaInteractivaUNA
{
    class Program
    {
        static HttpListener listener;
        static string baseDir;
        static int port = 8080;

        static void Main(string[] args)
        {
            Console.Title = "Pantalla Interactiva UNA Puno - Sistema Digital Signage";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("===============================================================");
            Console.WriteLine("    PANTALLA INTERACTIVA UNA PUNO - SEÑALÉTICA DIGITAL KIOSK   ");
            Console.WriteLine("===============================================================");
            Console.ResetColor();

            baseDir = AppDomain.CurrentDomain.BaseDirectory;
            StartHttpServer();

            string url = "http://127.0.0.1:" + port + "/";
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("\n [OK] Servidor Kiosk Activo en: " + url);
            Console.ResetColor();
            Console.WriteLine(" [i] Abriendo pantalla interactiva en modo tótem...");
            Console.WriteLine("---------------------------------------------------------------");
            Console.WriteLine("  * Presiona [Enter] para volver a abrir en pantalla completa");
            Console.WriteLine("  * Presiona [F11] en la ventana para alternar pantalla completa");
            Console.WriteLine("  * Cierra esta ventana para detener el servidor");
            Console.WriteLine("---------------------------------------------------------------\n");

            OpenBrowser(url);

            // Mantener el servidor siempre activo
            while (true)
            {
                Console.ReadLine();
                Console.WriteLine("Reabriendo pantalla interactiva...");
                OpenBrowser(url);
            }
        }

        static void OpenBrowser(string url)
        {
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            string kioskArgs = "--app=\"" + url + "\" --start-fullscreen";

            try
            {
                if (File.Exists(chromePath))
                {
                    Process.Start(new ProcessStartInfo(chromePath, kioskArgs));
                }
                else if (File.Exists(edgePath))
                {
                    Process.Start(new ProcessStartInfo(edgePath, kioskArgs));
                }
                else
                {
                    Process.Start(new ProcessStartInfo("cmd", "/c start " + url) { CreateNoWindow = true, UseShellExecute = false });
                }
            }
            catch
            {
                try
                {
                    Process.Start(new ProcessStartInfo("cmd", "/c start " + url) { CreateNoWindow = true, UseShellExecute = false });
                }
                catch { }
            }
        }

        static void StartHttpServer()
        {
            int[] testPorts = { 8080, 8088, 8089, 8090, 8095, 5500 };
            bool started = false;

            foreach (int p in testPorts)
            {
                try
                {
                    listener = new HttpListener();
                    listener.Prefixes.Add("http://127.0.0.1:" + p + "/");
                    listener.Start();
                    port = p;
                    started = true;
                    break;
                }
                catch
                {
                    if (listener != null)
                    {
                        try { listener.Close(); } catch { }
                    }
                }
            }

            if (!started)
            {
                listener = new HttpListener();
                listener.Prefixes.Add("http://127.0.0.1:8888/");
                listener.Start();
                port = 8888;
            }

            ThreadPool.QueueUserWorkItem((o) =>
            {
                while (listener != null && listener.IsListening)
                {
                    try
                    {
                        var context = listener.GetContext();
                        ThreadPool.QueueUserWorkItem((c) => HandleRequest((HttpListenerContext)c), context);
                    }
                    catch { break; }
                }
            });
        }

        static void HandleRequest(HttpListenerContext context)
        {
            try
            {
                string rawUrl = context.Request.Url.AbsolutePath.TrimStart('/');
                if (string.IsNullOrEmpty(rawUrl)) rawUrl = "index.html";

                rawUrl = rawUrl.Replace('/', Path.DirectorySeparatorChar);
                string filePath = Path.Combine(baseDir, rawUrl);

                if (File.Exists(filePath))
                {
                    byte[] bytes = File.ReadAllBytes(filePath);
                    context.Response.ContentType = GetMimeType(filePath);
                    context.Response.ContentLength64 = bytes.Length;
                    context.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                    context.Response.OutputStream.Write(bytes, 0, bytes.Length);
                    context.Response.StatusCode = 200;
                }
                else
                {
                    context.Response.StatusCode = 404;
                }
            }
            catch { }
            finally
            {
                try { context.Response.OutputStream.Close(); } catch { }
            }
        }

        static string GetMimeType(string path)
        {
            string ext = Path.GetExtension(path).ToLower();
            switch (ext)
            {
                case ".html": return "text/html; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".js": return "application/javascript; charset=utf-8";
                case ".json": return "application/json; charset=utf-8";
                case ".png": return "image/png";
                case ".jpg":
                case ".jpeg": return "image/jpeg";
                case ".svg": return "image/svg+xml";
                case ".ico": return "image/x-icon";
                default: return "application/octet-stream";
            }
        }
    }
}
