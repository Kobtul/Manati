from django.shortcuts import get_object_or_404, render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from django.core.urlresolvers import reverse
from django.views import generic
from .models import *
from manati_ui.forms import UserProfileForm
from django.contrib.auth.models import User, AnonymousUser
from django.views.decorators.csrf import csrf_exempt
from helpers import *
import json, collections
from django.core import serializers
from django.contrib.auth.mixins import LoginRequiredMixin
from utils import *
from share_modules.util import *
from api_manager.core.modules_manager import ModulesManager
from api_manager.models import *
from preserialize.serialize import serialize
from django.db.models import Q
import logging

# Get an instance of a logger
logger = logging.getLogger(__name__)

REDIRECT_TO_LOGIN = "/manati_project/login"
# class IndexView(generic.ListView):
#     template_name = 'manati_ui/index.html'
#     context_object_name = 'latest_question_list'
#
#     def get_queryset(self):
#         """
# 		Return the last five published questions (not including those set to be
# 		published in the future).
# 		"""
#         return ''

# class AnalysisSessionNewView(generic.DetailView):
#     model = AnalysisSession
#     template_name = 'manati_ui/analysis_session/new.html'


def postpone(function):
    def decorator(*args, **kwargs):
        t = Thread(target=function, args=args, kwargs=kwargs)
        t.daemon = True
        t.start()

    return decorator


@postpone
def call_after_save_event(analysis_session):
    ModulesManager.after_save_attach_event(analysis_session)

# @login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def new_analysis_session_view(request):
    context = {}
    return render(request, 'manati_ui/analysis_session/new.html', context)

@csrf_exempt
def new_profile_session_view(request):
    context = {}
    return render(request, 'manati_ui/profile/new.html', context)

#ajax connexions
@login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def create_analysis_session(request):
    analysis_session_id = -1
    # try:
    if request.method == 'POST':
        current_user = request.user
        filename = str(request.POST.get('filename', ''))
        u_data_list = json.loads(request.POST.get('data[]',''))
        u_key_list = json.loads(request.POST.get('headers[]',''))
        type_file = request.POST.get('type_file','')
        print type_file
        analysis_session = AnalysisSession.objects.create(filename, u_key_list, u_data_list,current_user,type_file)

        if not analysis_session :
            # messages.error(request, 'Analysis Session wasn\'t created .')
            return HttpResponseServerError("Error saving the data")
        else:
            # messages.success(request, 'Analysis Session was created .')
            analysis_session_id = analysis_session.id
            call_after_save_event(analysis_session)
            return JsonResponse(dict(data={'analysis_session_id': analysis_session_id, 'filename': analysis_session.name },
                                     msg='Analysis Session was created .'))

    else:
        messages.error(request, 'Only POST request')
        return HttpResponseServerError("Only POST request")
    # except Exception as e:
    #     messages.error(request, 'Error Happened')
    #     data = {'dd': 'something', 'safe': True}
    #     # return JsonResponse({"nothing to see": "this isn't happening"})
    #     return render_to_json(request, data)


# @login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def make_virus_total_consult(request):
    try:
        if request.method == 'GET':
            current_user = request.user
            qn = str(request.GET.get('query_node', ''))
            query_type, query_node = get_data_from_url(qn)
            # query_type = str(request.GET.get('query_type', ''))
            if not current_user.is_authenticated():
                current_user = User.objects.get(username='anonymous_user_for_metrics')
            vtc_query_set = VTConsult.get_query_info(query_node, current_user,query_type)

            return JsonResponse(dict(query_node=query_node,
                                     info_report=vtc_query_set.info_report,
                                     msg='VT Consult Done'))
        else:
            return HttpResponseServerError("Only POST request")
    except Exception as e:
        print_exception()
        return HttpResponseServerError("There was a error in the Server")


# @login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def make_whois_consult(request):
    try:
        if request.method == 'GET':
            current_user = request.user
            if not current_user.is_authenticated():
                current_user = User.objects.get(username='anonymous_user_for_metrics')
            qn = str(request.GET.get('query_node', ''))
            # query_type = str(request.GET.get('query_type', ''))
            query_type, query_node = get_data_from_url(qn)
            if query_type == "ip":
                wc_query_set = WhoisConsult.get_query_info_by_ip(query_node, current_user)
            else:
                wc_query_set = WhoisConsult.get_query_info_by_domain(query_node, current_user)

            return JsonResponse(dict(query_node=query_node,
                                     info_report=wc_query_set.info_report,
                                     msg='Whois Consult Done'))
        else:
            return HttpResponseServerError("Only POST request")
    except Exception as e:
        print_exception()
        return HttpResponseServerError("There was a error in the Server")

@login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def export_metrics(request):
    try:
        if request.method == 'GET':
            metrics = Metric.objects.all()
            data = serializers.serialize('json', metrics)
            response = HttpResponse(data, content_type='application/json')
            response['Content-Disposition'] = 'attachment; filename=metrics.json'
            return response
        else:
            return HttpResponseServerError("Only POST request")
    except Exception as e:
        print_exception()
        return HttpResponseServerError("There was a error in the Server")


# @login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def get_weblog_history(request):
    try:
        if request.method == 'GET':
            # current_user = request.user
            weblog_id = str(request.GET.get('weblog_id', ''))
            webh_query_set = WeblogHistory.objects.filter(weblog_id=weblog_id).order_by('-created_at')
            # webh_json = serializers.serialize("json", webh_query_set)
            webh_json = serialize(webh_query_set,
                                  fields=['id', 'weblog_id','version','created_at','verdict', 'old_verdict','author_name'],
                                  exclude=['weblog'],
                                  aliases={'author_name': 'get_author_name', 'created_at':'created_at_txt'})
            return JsonResponse(dict(data=json.dumps(webh_json), msg='WeblogHistory Consulst DONE'))
        else:
            return HttpResponseServerError("Only POST request")
    except Exception as e:
        print_exception()
        return HttpResponseServerError("There was a error in the Server")

@csrf_exempt
# def get_weblogs_whois_related(request, id):
#     current_weblog = Weblog.objects.get(id=id)
#     analysis_session = current_weblog.analysis_session
#     ModulesManager.get_weblogs_whois_related(current_weblog,analysis_session)

# @login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def get_weblogs_whois_related(request):
    try:
        if request.method == 'GET':
            # current_user = request.user
            weblog_id = str(request.GET.get('weblog_id', ''))
            weblog = Weblog.objects.get(id=weblog_id)
            weblogs_whois_related = weblog.whois_related_weblogs.all()
            whois_related = {}
            orig_was_whois_related = weblog.was_whois_related
            if not orig_was_whois_related:
                ModulesManager.get_weblogs_whois_related(weblog)
                weblog.was_whois_related = True
                weblog.save()

            for w in weblogs_whois_related:
                whois_related[w.id] = w.domain

            return JsonResponse(dict(data=json.dumps(whois_related), was_whois_related=orig_was_whois_related,
                                     msg='Getting Weblogs Whois-Related DONE'))
        else:
            return HttpResponseServerError("Only POST request")
    except Exception as e:
        print(e)
        print_exception()
        return HttpResponseServerError("There was a error in the Server")
# @login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def get_modules_changes(request):
    try:
        if request.method == 'GET':
            # current_user = request.user
            weblog_id = str(request.GET.get('weblog_id', ''))
            weblog = Weblog.objects.filter(id=weblog_id).first()
            return JsonResponse(dict(data=json.dumps(weblog.mod_attributes), msg='Modules Changes History Consulst DONE'))
        else:
            return HttpResponseServerError("Only POST request")
    except Exception as e:
        print_exception()
        return HttpResponseServerError("There was a error in the Server")


def convert(data):
    if isinstance(data, basestring):
        return str(data)
    elif isinstance(data, collections.Mapping):
        return dict(map(convert, data.iteritems()))
    elif isinstance(data, collections.Iterable):
        return type(data)(map(convert, data))
    else:
        return data

@csrf_exempt
def get_profile(request):
    try:
        if request.method == 'POST':
            user = request.user
            received_json_data = json.loads(request.body)
            analysis_session_id = received_json_data['analysis_session_id']
            if user.is_authenticated():
                result = {}
                for profile in Profile.objects.filter(analysissession=analysis_session_id):
                    result[profile.ip] = profile.data
                #return JsonResponse(dict(data=json.dumps(result),msg='Getting Weblogs Whois-Related DONE'))
                return JsonResponse(result)

        else:
            messages.error(request, 'Only POST request')
            return HttpResponseServerError("Only POST request")
    except Exception as e:
        error = print_exception()
        logger.error(str(error))
        logger.error(str(e.message))
        return HttpResponseServerError("ERROR in the server: " + str(e.message) + "\n:" + error)

@csrf_exempt
def create_profile(request):
    try:
        if request.method == 'POST':
            user = request.user
            received_json_data = json.loads(request.body)
            analysis_session_id = received_json_data['analysis_session_id']
            ips = received_json_data['data']
            #whois = WhoisConsult.objects.filter(user=user).first()  No guarantee that the line exists
            analysisobject = AnalysisSession.objects.filter(id=analysis_session_id).first()
            analysisobject.run_profile(ips)
            return HttpResponse(status=204)
        else:
            messages.error(request, 'Only POST request')
            return HttpResponseServerError("Only POST request")
    except Exception as e:
        error = print_exception()
        logger.error(str(error))
        logger.error(str(e.message))
        return HttpResponseServerError("ERROR in the server: " + str(e.message) + "\n:" + error)

# @login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def sync_db(request):
    try:
        if request.method == 'POST':
            user = request.user
            received_json_data = json.loads(request.body)
            analysis_session_id = received_json_data['analysis_session_id']
            data = {}
            if user.is_authenticated():
                if "headers[]" in received_json_data:
                    headers = json.loads(received_json_data['headers[]'])
                    analysis_session = AnalysisSession.objects.get(id=analysis_session_id)
                    analysis_session.set_columns_order_by(request.user, headers)
                    print("Headers Updated")
                data = convert(received_json_data['data'])

            wb_query_set = AnalysisSession.objects.sync_weblogs(analysis_session_id, data,user)
            json_query_set = serializers.serialize("json", wb_query_set)
            ModulesManager.attach_all_event() # it will check if will create the task or not
            return JsonResponse(dict(data=json_query_set, msg='Sync DONE'))
        else:
            messages.error(request, 'Only POST request')
            return HttpResponseServerError("Only POST request")
    except Exception as e:
        error = print_exception()
        logger.error(str(error))
        logger.error(str(e.message))
        return HttpResponseServerError("ERROR in the server: " + str(e.message) + "\n:" + error)


@login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def delete_analysis_session(request, id):
    AnalysisSession.objects.filter(id=id).delete()
    return HttpResponseRedirect("/manati_ui/analysis_sessions")


# @login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def sync_metrics(request):
    try:
        if request.method == 'POST':
            current_user = request.user
            if not current_user.is_authenticated():
                current_user = User.objects.get(username='anonymous_user_for_metrics')
            u_measurements = json.loads(request.POST.get('measurements[]', ''))
            u_keys = json.loads(request.POST.get('keys[]', ''))
            Metric.objects.create_bulk_by_user(u_measurements, current_user)
            json_data = json.dumps({'msg': 'Sync Metrics DONE',
                                    'measurements_length': len(u_measurements), 'keys': u_keys})
            return HttpResponse(json_data, content_type="application/json")
        else:
            return HttpResponseServerError("Only POST request")
    except Exception as e:
        print_exception()
        return HttpResponseServerError("There was a error in the Server")

@login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def publish_analysis_session(request, id):
    try:
        if request.method == 'POST':
            analysis_session = AnalysisSession.objects.get(id=id)
            publish_data = request.POST.get('publish', '')
            if publish_data == "True":
                analysis_session.public = True
                msg = "the Analysis Session " + analysis_session.name + " was posted"
            elif publish_data == "False":
                analysis_session.public = False
                msg = "the Analysis Session " + analysis_session.name + " is no public "
            else:
                raise ValueError("Incorrect Value")
            analysis_session.save()

            return JsonResponse(dict(msg=msg))

        else:
            messages.error(request, 'Only GET request')
            return HttpResponseServerError("Only GET request")
    except Exception as e:
        print_exception()
        return HttpResponseServerError("There was a error in the Server")

# @login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def get_weblogs(request):
    try:
        if request.method == 'GET':
            user = request.user
            analysis_session_id = request.GET.get('analysis_session_id', '')
            analysis_session = AnalysisSession.objects.get(id=analysis_session_id)
            headers = convert(analysis_session.get_columns_order_by(user))
            return JsonResponse(dict(weblogs=serializers.serialize("json", analysis_session.weblog_set.all()),
                                     analysissessionid=analysis_session_id,
                                     name=analysis_session.name,
                                     headers=json.dumps(headers)))

        else:
            messages.error(request, 'Only GET request')
            return HttpResponseServerError("Only GET request")
    except Exception as e:
        print_exception()
        return HttpResponseServerError("There was a error in the Server")


class IndexAnalysisSession(generic.ListView):
    login_url = REDIRECT_TO_LOGIN
    redirect_field_name = 'redirect_to'
    model = AnalysisSession
    template_name = 'manati_ui/analysis_session/index.html'
    context_object_name = 'analysis_sessions'

    def get_queryset(self):
        # Get the analysis session created by the admin (old website) and the current user or analysis session public
        user = self.request.user
        return AnalysisSession.objects.filter(Q(users__in=[user.id]) | Q(public=True))


class IndexExternalModules(generic.ListView):
    login_url = REDIRECT_TO_LOGIN
    redirect_field_name = 'redirect_to'
    model = ExternalModule
    template_name = 'manati_ui/modules/index.html'
    context_object_name = 'external_modules'

    def get_queryset(self):
        return ExternalModule.objects.exclude(status=ExternalModule.MODULES_STATUS.removed)


class EditAnalysisSession(generic.DetailView):
    login_url = REDIRECT_TO_LOGIN
    redirect_field_name = 'redirect_to'
    model = AnalysisSession
    template_name = 'manati_ui/analysis_session/edit.html'

    def get_context_data(self, **kwargs):
        context = super(EditAnalysisSession, self).get_context_data(**kwargs)
        object = super(EditAnalysisSession, self).get_object()
        context['analysis_session_id'] = object.id
        context['comment'] = object.comments.last() if object.comments.exists() else Comment()
        return context

@csrf_exempt
def render_edit_analysis_session(request,analysis_session_id):
    context = {"analysis_session_id": analysis_session_id}
    analysis_session = AnalysisSession.objects.get(id=analysis_session_id)

    if(analysis_session.type_file == 'argus_netflow'):
        return render(request, 'manati_ui/profile/edit.html', context)
    else:
        return render(request, 'manati_ui/analysis_session/edit.html', context)


@login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def profile_view(request):
    user = request.user
    form = UserProfileForm(initial={'first_name': user.first_name,
                                    'last_name': user.last_name,
                                    'email': user.email,
                                    'username': user.username})
    context = {"form": form}
    return render(request, 'manati_ui/user/edit.html', context)

@login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def update_comment_analysis_session(request, id):
    try:
        if request.method == 'POST':
            user = request.user
            analysis_session = AnalysisSession.objects.get(id=id)
            comment = analysis_session.comments.last() if analysis_session.comments.exists() else Comment(user=user,
                                                                                        content_object=analysis_session)
            comment.text = request.POST['text']
            comment.full_clean()
            comment.save()
            json_data = json.dumps({'msg':"The comment was save correcly"})
            return HttpResponse(json_data, content_type="application/json")

        else:
            return HttpResponseServerError("Only POST request")
    except Exception as e:
        print_exception()
        return HttpResponseServerError("There was a error in the Server")

@login_required(login_url=REDIRECT_TO_LOGIN)
@csrf_exempt
def profile_update(request):
    try:
        if request.method == 'POST':
            user = request.user
            form = UserProfileForm(request.POST or None)
            if form.is_valid():
                user.first_name = request.POST['first_name']
                user.last_name = request.POST['last_name']
                user.username = request.POST['username']
                user.email = request.POST['email']
                user.save()
            context = {
                "form": form
            }
            return HttpResponseRedirect(redirect_to='/')
        else:
            return HttpResponseServerError("Only POST request")
    except Exception as e:
        print_exception()
        return HttpResponseServerError("There was a error in the Server")




