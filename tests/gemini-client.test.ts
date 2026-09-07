import {it,expect,vi,afterEach} from 'vitest';
import {requestText} from '../src/services/gemini/client';
import {setGeminiApiKey} from '../src/services/session';
const {create}=vi.hoisted(()=>({create:vi.fn()}));
vi.mock('@google/genai',()=>({GoogleGenAI:class{interactions={create};}}));
afterEach(()=>{vi.useRealTimers();create.mockReset();sessionStorage.clear();});
it('retries a rate limit with stateless requests and then returns text',async()=>{vi.useFakeTimers();setGeminiApiKey('test-key');create.mockRejectedValueOnce({statusCode:429}).mockResolvedValue({output_text:'OK'});const status=vi.fn();const result=requestText('system','input','model',new AbortController().signal,undefined,status);await vi.advanceTimersByTimeAsync(2001);expect(await result).toBe('OK');expect(create).toHaveBeenCalledTimes(2);expect(create.mock.calls[0][0].store).toBe(false);expect(status).toHaveBeenCalledWith(expect.stringContaining('rate limit'));});
it('does not retry rejected keys or retain raw credential-bearing errors',async()=>{setGeminiApiKey('test-key');create.mockRejectedValue({statusCode:403,message:'secret-key-in-sdk-error'});await expect(requestText('s','i','model',new AbortController().signal)).rejects.toThrow('Your Gemini API key was rejected');expect(create).toHaveBeenCalledOnce();});
it('cancels retry backoff immediately',async()=>{vi.useFakeTimers();setGeminiApiKey('test-key');create.mockRejectedValue({statusCode:429});const c=new AbortController();const result=requestText('s','i','model',c.signal);const check=expect(result).rejects.toMatchObject({name:'AbortError'});await vi.advanceTimersByTimeAsync(1);c.abort();await check;expect(create).toHaveBeenCalledOnce();});
