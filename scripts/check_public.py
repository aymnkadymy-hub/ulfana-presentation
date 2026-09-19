#!/usr/bin/env python3
"""Read-only static release checks for the public Ulfana presentation package.

Usage: python3 scripts/check_public.py [path/to/_site]
No network calls, no source edits, and no secret values are printed.
Exit 0 = passed, 1 = release blockers, 2 = build not available yet.
This complements browser/screenshot QA; it cannot inspect text embedded in images.
"""
from __future__ import annotations

import json
import math
import re
import sys
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


DEFAULT = Path(__file__).resolve().parents[1] / '_site'
SITE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT
ERRORS: list[str] = []
WARNINGS: list[str] = []
RECORDS: list[dict] = []
TEXT_SUFFIXES = {'.html', '.css', '.js', '.json', '.md', '.txt', '.svg', '.xml', '.webmanifest'}
DOC_SUFFIXES = {'.pdf', '.md', '.txt', '.csv', '.json', '.zip'}
PRIVATE_PATH = re.compile(r'(?<![\w])(?:/home/|/mnt/|/tmp/|/Users/|[A-Za-z]:[\\/](?:Users|Windows)[\\/])|evaluation-private|observed-routes-private|qdrant_data|bm25_cache')
TOKEN_PATTERNS = [
    re.compile(r'\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b'),
    re.compile(r'\bgithub_pat_[A-Za-z0-9_]{30,}\b'),
    re.compile(r'\bsk-[A-Za-z0-9_-]{20,}\b'),
    re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    re.compile(r'\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b'),
    re.compile(r'\b(?:password|passwd|api[_-]?key|access[_-]?token|client[_-]?secret)\s*[=:]\s*[\"\'][^\"\']{4,}[\"\']', re.I),
]
SENSITIVE_JSON_KEYS = {'password', 'passwd', 'password_hash', 'password_salt', 'access_token', 'refresh_token', 'api_key', 'client_secret', 'cookies', 'cookie', 'maktaba_token', 'storage_state', 'auth_token'}


def short(p: Path) -> str:
    try:
        return p.relative_to(SITE).as_posix()
    except ValueError:
        return p.name


def fail(p: Path, message: str) -> None:
    ERRORS.append(f'{short(p)}: {message}')


def record_reference(owner: Path, raw: str, kind: str, label: str = '', download: bool = False) -> None:
    value = unescape(raw.strip())
    if not value or value.startswith(('#', 'data:', 'blob:', 'mailto:', 'tel:', 'javascript:')):
        if value.startswith('#'):
            RECORDS.append({'owner':short(owner),'kind':'anchor','reference':value})
        return
    if '${' in value or '{{' in value:
        WARNINGS.append(f'{short(owner)}: dynamic {kind} reference requires browser validation')
        return
    parts = urlsplit(value)
    if parts.scheme or parts.netloc:
        if parts.scheme == 'file':
            fail(owner, f'local filesystem URL in {kind}')
        elif parts.hostname in {'localhost', '127.0.0.1', '::1', '0.0.0.0'}:
            labelled = bool(re.search(r'محل[يّي]|هذا الجهاز|جهازك|local|this device',label,re.I))
            RECORDS.append({'owner':short(owner),'kind':'local_server_link','labelled':labelled})
            if not labelled:
                fail(owner, 'localhost link is not clearly labelled as local/device-only')
        return
    path = unquote(parts.path)
    if not path:
        return
    target = (SITE / path.lstrip('/')) if path.startswith('/') else owner.parent / path
    target = target.resolve()
    try:
        target.relative_to(SITE.resolve())
    except ValueError:
        fail(owner, f'{kind} escapes the public package')
        return
    if target.is_dir():
        target = target / 'index.html'
    is_doc = download or target.suffix.lower() in DOC_SUFFIXES
    RECORDS.append({'owner':short(owner),'kind':'document' if is_doc else kind,'reference':value,'exists':target.is_file()})
    if not target.is_file():
        fail(owner, f'missing {"document/download" if is_doc else kind}: {value}')


class Document(HTMLParser):
    def __init__(self, owner: Path):
        super().__init__(convert_charrefs=True)
        self.owner = owner
        self.links: list[dict] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str,str | None]]) -> None:
        a = dict(attrs)
        if tag == 'a' and a.get('href'):
            self.links.append({'href':a['href'],'label':' '.join(a.get(x) or '' for x in ['aria-label','title']),'download':'download' in a})
        elif a.get('href'):
            record_reference(self.owner,a['href'],'href')
        for key in ['src','poster','data-screenshot']:
            if a.get(key):
                record_reference(self.owner,a[key],key)
        if a.get('srcset'):
            for item in a['srcset'].split(','):
                record_reference(self.owner,item.strip().split()[0],'srcset')
        if a.get('style'):
            css_refs(self.owner,a['style'])
        if tag == 'meta' and (a.get('http-equiv') or '').lower() == 'refresh':
            m = re.search(r'url\s*=\s*(.+)',a.get('content') or '',re.I)
            if m:
                record_reference(self.owner,m.group(1).strip('\"\''),'redirect')

    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)

    def handle_data(self,data: str) -> None:
        for link in self.links:
            link['label'] += ' ' + data

    def handle_endtag(self,tag: str) -> None:
        if tag == 'a' and self.links:
            link = self.links.pop()
            record_reference(self.owner,link['href'],'href',link['label'],link['download'])


def css_refs(owner: Path, text: str) -> None:
    for m in re.finditer(r'url\(\s*[\"\']?([^\)\"\']+)[\"\']?\s*\)',text):
        record_reference(owner,m.group(1),'css-url')
    for m in re.finditer(r'@import\s+[\"\']([^\"\']+)',text):
        record_reference(owner,m.group(1),'css-import')


def walk_json(owner: Path, item, location: str = '$') -> None:
    if isinstance(item,dict):
        for key,value in item.items():
            if key.lower() in SENSITIVE_JSON_KEYS and value not in [None, '', [], {}]:
                fail(owner,f'sensitive JSON field: {location}.{key}')
            walk_json(owner,value,f'{location}.{key}')
    elif isinstance(item,list):
        for i,value in enumerate(item):
            walk_json(owner,value,f'{location}[{i}]')


def number(value) -> bool:
    return isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value)


def validate_evaluation(owner: Path, d: dict, require_retrieval: bool = True) -> None:
    if d.get('status') != 'complete':
        fail(owner,'public evaluation status must be complete before release')
    sample = d.get('sample',{})
    answerable, absent, paired = [sample.get(k) for k in ['answerable','unanswerable','paired_questions']]
    if not all(number(x) and x >= 0 for x in [answerable,absent,paired]) or answerable + absent != paired:
        fail(owner,'sample denominators inconsistent: answerable + unanswerable must equal paired_questions')
        return
    if all(k in sample for k in ['general_course','source_specific']) and sample['general_course'] + sample['source_specific'] != answerable:
        fail(owner,'general_course + source_specific must equal answerable')
    arms = d.get('arms',{})
    if not all(k in arms for k in ['alone','rag']):
        fail(owner,'both alone and rag arms are required')
    for name,arm in arms.items():
        for numerator,denominator,expected in [('correct','total',answerable),('grounded_citations','citation_total',answerable),('abstained_correctly','abstention_total',absent)]:
            n,den = arm.get(numerator),arm.get(denominator)
            if den != expected:
                fail(owner,f'{name}.{denominator} must equal sample denominator {expected}')
            if not number(n) or not number(den) or not 0 <= n <= den:
                fail(owner,f'{name}.{numerator} must be a measured count within its denominator')
        if number(arm.get('correct_rate')) and arm.get('total',0) > 0 and number(arm.get('correct')):
            proportion = arm['correct'] / arm['total']
            if min(abs(arm['correct_rate']-proportion),abs(arm['correct_rate']-100*proportion)) > 0.11:
                fail(owner,f'{name}.correct_rate disagrees with correct / total')
        if not number(arm.get('median_seconds')) or arm['median_seconds'] < 0:
            fail(owner,f'{name}.median_seconds must be nonnegative')
    if require_retrieval:
        retrieval = d.get('retrieval',{})
        if retrieval.get('total') != answerable:
            fail(owner,'retrieval.total must equal answerable')
        for key in ['correct_book_at_1','correct_book_at_8','reference_page_at_8']:
            v = retrieval.get(key)
            if not number(v) or not 0 <= v <= answerable:
                fail(owner,f'retrieval.{key} must be a measured count within retrieval.total')
    if not d.get('method') or not d.get('limitations'):
        fail(owner,'evaluation method and limitations are required')
    if d.get('live_probe'):
        validate_evaluation(owner,d['live_probe'],require_retrieval=False)


def reconcile_grades() -> None:
    ep, gp, lp = [SITE/'data'/n for n in ['evaluation.json','answer-grades.json','live-probe-results.json']]
    try:
        evaluation = json.loads(ep.read_text())
        if gp.is_file():
            grades = json.loads(gp.read_text())['grades']
            answerable = [g for g in grades if g['answerable']]
            absent = [g for g in grades if not g['answerable']]
            if len(grades) != evaluation['sample']['paired_questions']:
                fail(gp,'grade count differs from evaluation sample size')
            for arm in ['alone','rag']:
                expected = {
                    'correct':sum(g[arm]['complete_correct'] for g in answerable),
                    'grounded_citations':sum(g[arm]['grounded_complete_answer'] for g in answerable),
                    'partial':sum(g[arm]['partial'] for g in answerable),
                    'incorrect_abstentions':sum(g[arm]['incorrect_abstention'] for g in answerable),
                    'abstained_correctly':sum(g[arm]['correct_abstention'] for g in absent),
                    'required_facts_met':sum(g[arm]['required_facts_met'] for g in answerable),
                    'required_facts_total':sum(g[arm]['required_facts_total'] for g in answerable),
                }
                for key,value in expected.items():
                    if evaluation['arms'][arm].get(key) != value:
                        fail(gp,f'{arm}.{key} aggregate differs from public summary')
        live = evaluation.get('live_probe')
        if live:
            if not lp.is_file() or json.loads(lp.read_text()) != live:
                fail(lp,'standalone live results differ from embedded results')
            for arm in ['alone','rag']:
                grades = live['grades']
                actual = {
                    'correct':sum(bool(g[arm+'_correct']) for g in grades if g['answerable']),
                    'abstained_correctly':sum(bool(g[arm+'_correct']) for g in grades if not g['answerable']),
                }
                if arm == 'rag':
                    actual['grounded_citations'] = sum(bool(g['rag_grounded']) for g in grades if g['answerable'])
                for key,value in actual.items():
                    if live['arms'][arm].get(key) != value:
                        fail(lp,f'{arm}.{key} aggregate differs from public live summary')
    except (OSError,KeyError,TypeError,json.JSONDecodeError) as exc:
        fail(ep,f'cannot reconcile public grades: {type(exc).__name__}')



def reconcile_expanded() -> None:
    ep, gp = SITE/'data'/'expanded-benchmark.json', SITE/'data'/'expanded-grades.json'
    try:
        d, grades = json.loads(ep.read_text()), json.loads(gp.read_text())['grades']
        sample = d['sample']
        if d['status'] != 'complete' or len(grades) != sample['accepted_responses']:
            fail(ep, 'expanded benchmark incomplete')
        keys = {(g['id'], g['arm']) for g in grades}
        if len(keys) != len(grades) or len(grades) != 2 * sample['paired_prompts']:
            fail(gp, 'duplicate or missing response grades')
        if sample['paired_prompts'] != sample['base_unique_questions'] + sample['source_bound_rephrasings']:
            fail(ep, 'source rephrasings must be counted separately')
        if sample['base_unique_questions'] != sample['answerable_mcq'] + sample['unanswerable']:
            fail(ep, 'base question denominators inconsistent')
        if sample['total_attempts'] != sample['accepted_responses'] + sample['excluded_parser_attempts']:
            fail(ep, 'attempt accounting inconsistent')
        for group in d['groups']:
            for arm in ['alone', 'rag']:
                rows = [g for g in grades if g['domain'] == group['domain'] and g['arm'] == arm]
                if len(rows) != group['total'] or not all(isinstance(g['correct'], bool) for g in rows):
                    fail(gp, 'incomplete group grades')
                if sum(g['correct'] is True for g in rows) != group[arm]['correct']:
                    fail(ep, 'expanded summary disagrees with individual grades')
                if sum(bool(g['error']) for g in rows) != group[arm]['failed_requests']:
                    fail(ep, 'failed response accounting inconsistent')
        for arm in ['alone','rag']:
            rows = [g for g in grades if g['domain'] in ['ai_search','computer_skills'] and g['arm'] == arm]
            if d['answerable_aggregate'][arm] != {'correct':sum(g['correct'] for g in rows),'total':len(rows)}:
                fail(ep, 'answerable aggregate disagrees with grades')
        historical=json.loads((SITE/'data'/'historical-benchmarks.json').read_text())['fusion_ablation.json']
        if historical['arms']['full']['at1'] != 41 or historical['arms']['fused']['at1'] != 26 or historical['sample'] != 67:
            fail(ep, 'slide 5 disagrees with historical evidence')
    except (OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
        fail(ep, f'cannot reconcile expanded benchmark: {type(exc).__name__}')


def main() -> int:
    if not SITE.is_dir():
        print(json.dumps({'status':'not_built','package':str(SITE),'message':'Run once _site exists.'},ensure_ascii=False,indent=2))
        return 2
    if not (SITE/'index.html').is_file():
        ERRORS.append('index.html: missing entry point')
    count = 0
    for p in sorted(SITE.rglob('*')):
        if not p.is_file():
            continue
        count += 1
        lower = p.name.lower()
        if p.is_symlink():
            fail(p,'symlink is not allowed in the public package')
        if p.suffix.lower() in {'.db','.sqlite','.sqlite3','.pem','.key','.p12','.pfx','.pyc'} or lower.startswith('.env') or any(x in lower for x in ['cookie','storage-state','storage_state','auth.db','private','credentials']) or lower.endswith(('-wal','-shm')):
            fail(p,'sensitive/local-only filename or extension')
        if any(part in {'.git','.venv','__pycache__','node_modules'} for part in p.relative_to(SITE).parts):
            fail(p,'development internals included in release')
        if p.suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            text = p.read_text(encoding='utf-8')
        except UnicodeError:
            fail(p,'text asset is not valid UTF-8')
            continue
        if PRIVATE_PATH.search(text):
            fail(p,'private filesystem path or private artifact reference')
        for pattern in TOKEN_PATTERNS:
            if pattern.search(text):
                fail(p,'potential embedded credential; value intentionally omitted')
                break
        if p.suffix == '.html':
            Document(p).feed(text)
        elif p.suffix == '.css':
            css_refs(p,text)
        elif p.suffix == '.md':
            for m in re.finditer(r'\[[^\]]*\]\(([^)]+)\)',text):
                record_reference(p,m.group(1),'markdown-link')
        elif p.suffix == '.js':
            # Includes fetch URLs and dynamically-created src/href templates that are
            # literal local paths. Computed filenames still need browser coverage.
            for m in re.finditer(r'[\"\']((?:\.?\.?/)?(?:assets|data)/[^\"\'<>\s]+\.(?:png|webp|svg|jpe?g|woff2?|json|md|pdf|txt))[\"\']',text):
                record_reference(p,m.group(1),'js-literal-asset')
        elif p.suffix == '.json':
            try:
                d = json.loads(text)
            except json.JSONDecodeError:
                fail(p,'invalid JSON')
                continue
            walk_json(p,d)
            if p.name == 'evaluation.json':
                validate_evaluation(p,d)
            if p.name == 'kpis.json':
                for item in d.get('proposed_kpis',[]):
                    if item.get('status') == 'proposed' and item.get('value') is not None:
                        fail(p,f'proposed KPI {item.get("id")} has an unexplained measured value')
    if not (SITE/'data'/'evaluation.json').is_file():
        ERRORS.append('data/evaluation.json: missing completed public evaluation')
    else:
        reconcile_grades()
    reconcile_expanded()
    unique_records = list({json.dumps(x,sort_keys=True):x for x in RECORDS}.values())
    print(json.dumps({'status':'passed' if not ERRORS else 'blocked','files_checked':count,'references_checked':len(unique_records),'errors':sorted(set(ERRORS)),'warnings':sorted(set(WARNINGS)),'documents':[x for x in unique_records if x['kind']=='document'],'local_server_links':[x for x in unique_records if x['kind']=='local_server_link'],'anchors_recorded':sum(x['kind']=='anchor' for x in unique_records),'limitations':['Static checks cannot inspect private information embedded in images or PDFs.','Computed JS asset URLs and interactive states require browser QA.']},ensure_ascii=False,indent=2))
    return 1 if ERRORS else 0


if __name__ == '__main__':
    raise SystemExit(main())
